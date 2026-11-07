// Account + runner profile for Run Tianjin, backed by Supabase.
//
// The site is static, so Supabase is the whole backend: it stores accounts,
// verifies passwords, sends confirmation mail, and holds each runner's profile
// and training log. Nothing here is a secret — the anon key is designed to be
// public. Row Level Security in Supabase is what actually protects the data.
//
// Setup (see README "Accounts"): create a free project at supabase.com, run
// supabase/schema.sql in the SQL editor, then paste the project URL and anon
// key into SUPABASE_URL / SUPABASE_ANON_KEY below.
(function () {
  'use strict';

  // ---------------------------------------------------------------- config
  // Fill these in after creating your Supabase project. Both values are public.
  var SUPABASE_URL = '';
  var SUPABASE_ANON_KEY = '';

  var CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

  // ---------------------------------------------------------------- state
  var client = null;
  var session = null;
  var profile = null;
  var listeners = [];

  function notify() {
    listeners.forEach(function (fn) {
      try {
        fn(getState());
      } catch (error) {
        console.error('auth listener failed', error);
      }
    });
  }

  function getState() {
    return {
      configured: CONFIGURED,
      signedIn: Boolean(session && session.user),
      user: session && session.user ? session.user : null,
      profile: profile
    };
  }

  // ---------------------------------------------------------------- client
  // Loaded lazily from the CDN so pages that never touch auth pay nothing.
  var sdkPromise = null;

  function loadSdk() {
    if (!CONFIGURED) return Promise.reject(new Error('Supabase is not configured'));
    if (sdkPromise) return sdkPromise;

    sdkPromise = new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) {
        resolve(window.supabase);
        return;
      }
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      script.async = true;
      script.onload = function () {
        if (window.supabase && window.supabase.createClient) {
          resolve(window.supabase);
        } else {
          reject(new Error('Supabase SDK loaded but createClient is missing'));
        }
      };
      script.onerror = function () {
        reject(new Error('Could not load the Supabase SDK'));
      };
      document.head.appendChild(script);
    });

    return sdkPromise;
  }

  function getClient() {
    if (client) return Promise.resolve(client);
    return loadSdk().then(function (sdk) {
      client = sdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      client.auth.onAuthStateChange(function (_event, nextSession) {
        session = nextSession;
        if (session && session.user) {
          loadProfile().then(notify, notify);
        } else {
          profile = null;
          notify();
        }
      });
      return client;
    });
  }

  // ---------------------------------------------------------------- profile
  // One row per user in public.profiles, created by a trigger on signup.
  function loadProfile() {
    if (!client || !session || !session.user) return Promise.resolve(null);
    return client
      .from('profiles')
      .select('display_name, weekly_goal_km, home_route, level, created_at')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(function (result) {
        if (result.error) throw result.error;
        profile = result.data || null;
        return profile;
      });
  }

  function saveProfile(patch) {
    if (!client || !session || !session.user) {
      return Promise.reject(new Error('Sign in first'));
    }
    var row = {
      id: session.user.id,
      display_name: patch.display_name,
      weekly_goal_km: patch.weekly_goal_km,
      home_route: patch.home_route,
      level: patch.level,
      updated_at: new Date().toISOString()
    };
    return client
      .from('profiles')
      .upsert(row, { onConflict: 'id' })
      .select()
      .then(function (result) {
        if (result.error) throw result.error;
        profile = result.data && result.data[0] ? result.data[0] : profile;
        notify();
        return profile;
      });
  }

  // ---------------------------------------------------------------- auth
  function signUp(email, password, displayName) {
    return getClient().then(function (c) {
      return c.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { display_name: displayName || '' },
          emailRedirectTo: window.location.origin + window.location.pathname
        }
      });
    }).then(function (result) {
      if (result.error) throw result.error;
      return result.data;
    });
  }

  function signIn(email, password) {
    return getClient().then(function (c) {
      return c.auth.signInWithPassword({ email: email, password: password });
    }).then(function (result) {
      if (result.error) throw result.error;
      session = result.data.session;
      return loadProfile().then(function () {
        notify();
        return result.data;
      });
    });
  }

  function signOut() {
    if (!client) return Promise.resolve();
    return client.auth.signOut().then(function () {
      session = null;
      profile = null;
      notify();
    });
  }

  function resetPassword(email) {
    return getClient().then(function (c) {
      return c.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
      });
    }).then(function (result) {
      if (result.error) throw result.error;
      return true;
    });
  }

  // ---------------------------------------------------------------- training log
  // Mirrors the local history in map-app.js so a signed-in runner keeps their
  // log across devices. Local storage stays the source of truth offline.
  function listRuns() {
    if (!client || !session || !session.user) return Promise.resolve([]);
    return client
      .from('runs')
      .select('id, route, distance_km, duration_min, ran_on, note')
      .order('ran_on', { ascending: false })
      .limit(200)
      .then(function (result) {
        if (result.error) throw result.error;
        return result.data || [];
      });
  }

  function addRun(run) {
    if (!client || !session || !session.user) {
      return Promise.reject(new Error('Sign in first'));
    }
    return client
      .from('runs')
      .insert({
        user_id: session.user.id,
        route: run.route,
        distance_km: run.distance_km,
        duration_min: run.duration_min,
        ran_on: run.ran_on,
        note: run.note || ''
      })
      .select()
      .then(function (result) {
        if (result.error) throw result.error;
        return result.data && result.data[0];
      });
  }

  function deleteRun(id) {
    if (!client || !session || !session.user) {
      return Promise.reject(new Error('Sign in first'));
    }
    return client
      .from('runs')
      .delete()
      .eq('id', id)
      .then(function (result) {
        if (result.error) throw result.error;
        return true;
      });
  }

  // ---------------------------------------------------------------- boot
  // Restore an existing session on page load so the nav can show the name.
  function ready() {
    if (!CONFIGURED) return Promise.resolve(getState());
    return getClient()
      .then(function (c) {
        return c.auth.getSession();
      })
      .then(function (result) {
        session = result.data ? result.data.session : null;
        if (session && session.user) {
          return loadProfile().then(function () {
            notify();
            return getState();
          });
        }
        notify();
        return getState();
      })
      .catch(function (error) {
        console.error('Auth init failed', error);
        notify();
        return getState();
      });
  }

  function onChange(fn) {
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (item) {
        return item !== fn;
      });
    };
  }

  window.RunTianjinAuth = {
    configured: CONFIGURED,
    ready: ready,
    onChange: onChange,
    getState: getState,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    resetPassword: resetPassword,
    saveProfile: saveProfile,
    loadProfile: loadProfile,
    listRuns: listRuns,
    addRun: addRun,
    deleteRun: deleteRun
  };
})();
