// Account page controller: sign in / sign up / profile / training log.
// All persistence goes through window.RunTianjinAuth (auth.js → Supabase).
(function () {
  'use strict';

  var auth = window.RunTianjinAuth;
  if (!auth) return;

  var ROUTE_LABELS = {
    haihe: 'Haihe Riverside',
    nancui: 'South Cuiping Park',
    shuishang: 'Water Park Lakeside',
    taida: 'Binhai TEDA Coastal'
  };

  var el = {
    title: document.getElementById('account-title'),
    lead: document.getElementById('account-lead'),
    unconfigured: document.getElementById('account-unconfigured'),
    authBox: document.getElementById('account-auth'),
    panel: document.getElementById('account-panel'),
    status: document.getElementById('account-status'),
    greeting: document.getElementById('account-greeting'),
    email: document.getElementById('account-email'),
    signOut: document.getElementById('account-signout'),
    profileForm: document.getElementById('profile-form'),
    profileName: document.getElementById('profile-name'),
    profileGoal: document.getElementById('profile-goal'),
    profileRoute: document.getElementById('profile-route'),
    profileLevel: document.getElementById('profile-level'),
    profileStatus: document.getElementById('profile-status'),
    logForm: document.getElementById('log-form'),
    logRoute: document.getElementById('log-route'),
    logDistance: document.getElementById('log-distance'),
    logDuration: document.getElementById('log-duration'),
    logDate: document.getElementById('log-date'),
    logStatus: document.getElementById('log-status'),
    logSummary: document.getElementById('log-summary'),
    runList: document.getElementById('run-list'),
    runEmpty: document.getElementById('run-empty')
  };

  function say(node, text, kind) {
    if (!node) return;
    node.textContent = text || '';
    node.classList.remove('is-error', 'is-ok');
    if (kind) node.classList.add(kind);
  }

  // ---------------------------------------------------------------- tabs
  var tabs = document.querySelectorAll('.account-tab');
  var panels = {
    signin: document.getElementById('panel-signin'),
    signup: document.getElementById('panel-signup')
  };

  function showTab(name) {
    tabs.forEach(function (tab) {
      var active = tab.id === 'tab-' + name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    Object.keys(panels).forEach(function (key) {
      if (panels[key]) panels[key].hidden = key !== name;
    });
    say(el.status, '');
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      showTab(tab.id.replace('tab-', ''));
    });
  });

  // ---------------------------------------------------------------- sign in
  var signinForm = document.getElementById('panel-signin');
  if (signinForm) {
    signinForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var email = document.getElementById('signin-email').value.trim();
      var password = document.getElementById('signin-password').value;
      if (!email || !password) return;

      var button = signinForm.querySelector('.account-submit');
      button.disabled = true;
      button.textContent = 'Signing in…';
      say(el.status, '');

      auth
        .signIn(email, password)
        .then(function () {
          signinForm.reset();
          say(el.status, 'Signed in.', 'is-ok');
        })
        .catch(function (error) {
          say(el.status, friendlyError(error), 'is-error');
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = 'Sign in';
        });
    });
  }

  // ---------------------------------------------------------------- sign up
  var signupForm = document.getElementById('panel-signup');
  if (signupForm) {
    signupForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var name = document.getElementById('signup-name').value.trim();
      var email = document.getElementById('signup-email').value.trim();
      var password = document.getElementById('signup-password').value;
      if (!email || !password) return;

      var button = signupForm.querySelector('.account-submit');
      button.disabled = true;
      button.textContent = 'Creating…';
      say(el.status, '');

      auth
        .signUp(email, password, name)
        .then(function (data) {
          signupForm.reset();
          // Supabase returns a user but no session when email confirmation is on.
          if (data && data.session) {
            say(el.status, 'Account created. You are signed in.', 'is-ok');
          } else {
            say(el.status, 'Account created. Check your email to confirm, then sign in.', 'is-ok');
            showTab('signin');
          }
        })
        .catch(function (error) {
          say(el.status, friendlyError(error), 'is-error');
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = 'Create account';
        });
    });
  }

  // ---------------------------------------------------------------- reset
  var forgot = document.getElementById('forgot-password');
  if (forgot) {
    forgot.addEventListener('click', function () {
      var email = document.getElementById('signin-email').value.trim();
      if (!email) {
        say(el.status, 'Type your email above first, then press "Forgot password?".', 'is-error');
        return;
      }
      forgot.disabled = true;
      auth
        .resetPassword(email)
        .then(function () {
          say(el.status, 'Reset link sent. Check your inbox.', 'is-ok');
        })
        .catch(function (error) {
          say(el.status, friendlyError(error), 'is-error');
        })
        .finally(function () {
          forgot.disabled = false;
        });
    });
  }

  // ---------------------------------------------------------------- sign out
  if (el.signOut) {
    el.signOut.addEventListener('click', function () {
      el.signOut.disabled = true;
      auth.signOut().finally(function () {
        el.signOut.disabled = false;
      });
    });
  }

  // ---------------------------------------------------------------- profile
  if (el.profileForm) {
    el.profileForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var button = el.profileForm.querySelector('.account-submit');
      button.disabled = true;
      button.textContent = 'Saving…';
      say(el.profileStatus, '');

      auth
        .saveProfile({
          display_name: el.profileName.value.trim(),
          weekly_goal_km: Number(el.profileGoal.value) || 0,
          home_route: el.profileRoute.value,
          level: el.profileLevel.value
        })
        .then(function () {
          say(el.profileStatus, 'Profile saved.', 'is-ok');
        })
        .catch(function (error) {
          say(el.profileStatus, friendlyError(error), 'is-error');
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = 'Save profile';
        });
    });
  }

  // ---------------------------------------------------------------- log
  if (el.logDate) {
    el.logDate.value = new Date().toISOString().slice(0, 10);
  }

  if (el.logForm) {
    el.logForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var button = el.logForm.querySelector('.account-submit');
      button.disabled = true;
      button.textContent = 'Adding…';
      say(el.logStatus, '');

      auth
        .addRun({
          route: el.logRoute.value,
          distance_km: Number(el.logDistance.value),
          duration_min: Number(el.logDuration.value),
          ran_on: el.logDate.value
        })
        .then(function () {
          el.logDistance.value = '';
          el.logDuration.value = '';
          say(el.logStatus, 'Run added.', 'is-ok');
          return refreshRuns();
        })
        .catch(function (error) {
          say(el.logStatus, friendlyError(error), 'is-error');
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = 'Add run';
        });
    });
  }

  function formatDate(value) {
    if (!value) return '';
    var parts = String(value).split('-');
    if (parts.length !== 3) return value;
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function refreshRuns() {
    return auth.listRuns().then(function (runs) {
      if (!el.runList) return;

      el.runList.innerHTML = '';
      el.runEmpty.hidden = runs.length > 0;

      var totalKm = 0;
      var totalMin = 0;
      runs.forEach(function (run) {
        totalKm += Number(run.distance_km) || 0;
        totalMin += Number(run.duration_min) || 0;

        var li = document.createElement('li');
        li.className = 'account-run';

        var main = document.createElement('div');
        main.className = 'account-run-main';

        var route = document.createElement('strong');
        route.textContent = ROUTE_LABELS[run.route] || run.route;

        var meta = document.createElement('span');
        meta.className = 'account-run-meta';
        meta.textContent =
          formatDate(run.ran_on) +
          ' · ' +
          Number(run.distance_km).toFixed(1) +
          ' km · ' +
          run.duration_min +
          ' min';

        main.appendChild(route);
        main.appendChild(meta);

        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'account-run-delete';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', 'Remove run on ' + formatDate(run.ran_on));
        remove.addEventListener('click', function () {
          remove.disabled = true;
          auth
            .deleteRun(run.id)
            .then(refreshRuns)
            .catch(function (error) {
              remove.disabled = false;
              say(el.logStatus, friendlyError(error), 'is-error');
            });
        });

        li.appendChild(main);
        li.appendChild(remove);
        el.runList.appendChild(li);
      });

      if (el.logSummary) {
        if (!runs.length) {
          el.logSummary.textContent = '';
        } else {
          var pace = totalKm > 0 ? totalMin / totalKm : 0;
          el.logSummary.textContent =
            runs.length +
            (runs.length === 1 ? ' run · ' : ' runs · ') +
            totalKm.toFixed(1) +
            ' km total · avg ' +
            pace.toFixed(1) +
            ' min/km';
        }
      }
    });
  }

  // ---------------------------------------------------------------- render
  function render(state) {
    if (!state.configured) {
      el.unconfigured.hidden = false;
      el.authBox.hidden = true;
      el.panel.hidden = true;
      el.title.textContent = 'Accounts are not switched on yet.';
      el.lead.textContent =
        'The rest of the site works without an account. Follow the three steps below to enable sign-in.';
      return;
    }

    el.unconfigured.hidden = true;

    if (!state.signedIn) {
      el.authBox.hidden = false;
      el.panel.hidden = true;
      el.title.textContent = 'Sign in to keep your training log.';
      el.lead.textContent =
        'An account saves your runner profile, weekly goal, and run history so they follow you to any device. Everything else on this site works without one.';
      return;
    }

    el.authBox.hidden = true;
    el.panel.hidden = false;

    var user = state.user;
    var profile = state.profile || {};
    var name = (profile.display_name || '').trim();
    var email = user && user.email ? user.email : '';

    el.title.textContent = 'Your runner profile.';
    el.lead.textContent = 'Update your goal and log runs. Everything here syncs to your account.';
    el.greeting.textContent = name ? 'Welcome back, ' + name + '.' : 'Welcome back.';
    el.email.textContent = email;

    el.profileName.value = name;
    el.profileGoal.value = profile.weekly_goal_km != null ? profile.weekly_goal_km : 20;
    el.profileRoute.value = profile.home_route || 'haihe';
    el.profileLevel.value = profile.level || 'beginner';

    refreshRuns().catch(function (error) {
      say(el.logStatus, friendlyError(error), 'is-error');
    });
  }

  // ---------------------------------------------------------------- errors
  function friendlyError(error) {
    var message = (error && error.message) || 'Something went wrong.';
    if (/invalid login credentials/i.test(message)) return 'Wrong email or password.';
    if (/email not confirmed/i.test(message)) return 'Confirm your email first — check your inbox.';
    if (/user already registered/i.test(message)) return 'That email already has an account. Try signing in.';
    if (/password should be at least/i.test(message)) return 'Password is too short — use at least 8 characters.';
    if (/rate limit|too many/i.test(message)) return 'Too many attempts. Wait a minute and try again.';
    if (/failed to fetch|network/i.test(message)) return 'Network problem. Check your connection and try again.';
    return message;
  }

  // ---------------------------------------------------------------- boot
  auth.onChange(render);
  auth.ready().then(render);
})();
