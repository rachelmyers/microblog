/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * @return {!Object} The FirebaseUI config.
 */
function getUiConfig() {
  return {
    'callbacks': {
      // Called when the user has been successfully signed in.
      'signInSuccess': function(user, credential, redirectUrl) {
        handleSignedInUser(user);
        // Do not redirect.
        return false;
      }
    },
    // Opens IDP Providers sign-in flow in a popup.
    'signInFlow': 'popup',
    'signInOptions': [
      {
        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        // Required to enable this provider in One-Tap Sign-up.
        authMethod: 'https://accounts.google.com',
        // Required to enable ID token credentials for this provider.
        clientId: CLIENT_ID
      }
    ],
    // Terms of service url.
    'tosUrl': 'https://www.google.com',
    'credentialHelper': CLIENT_ID && CLIENT_ID != 'YOUR_OAUTH_CLIENT_ID' ?
        firebaseui.auth.CredentialHelper.GOOGLE_YOLO :
        firebaseui.auth.CredentialHelper.ACCOUNT_CHOOSER_COM
  };
}

// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());
// Disable auto-sign in.
ui.disableAutoSignIn();


/**
 * @return {string} The URL of the FirebaseUI standalone widget.
 */
function getWidgetUrl() {
  return '/widget#recaptcha=' + getRecaptchaMode();
};


/**
 * @return {string} The reCAPTCHA rendering mode from the configuration.
 */
function getRecaptchaMode() {
  // Quick way of checking query params in the fragment. If we add more config
  // we might want to actually parse the fragment as a query string.
  return location.hash.indexOf('recaptcha=invisible') !== -1 ?
      'invisible' : 'normal';
};

/**
 * Displays the UI for a signed in user.
 * @param {!firebase.User} user
 */
var handleSignedInUser = function(user) {
  document.getElementById('user-signed-in').style.display = 'block';
  document.getElementById('user-signed-out').style.display = 'none';
  document.getElementById('name').textContent = user.displayName;
  document.getElementById('uid').textContent = user.uid;
  if (user.photoURL){
    document.getElementById('user-photo').src = user.photoURL;
  }

  // When a user signs in, save basic user info to Firestore,
  var data = {
    name: user.displayName,
    email: user.email,
    photo: user.photoURL,
  };

  firebase.firestore().collection('users').doc(user.uid).set(data).then(function(transaction) {
    fetchPosts();
  });
};

/**
 * Displays the UI for a signed out user.
 */
var handleSignedOutUser = function() {
  document.getElementById('user-signed-in').style.display = 'none';
  document.getElementById('user-signed-out').style.display = 'block';
  ui.start('#firebaseui-container', getUiConfig());
};

// Listen to change in auth state so it displays the correct UI for when
// the user is signed in or not.
firebase.auth().onAuthStateChanged(function(user) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('loaded').style.display = 'block';
  user ? handleSignedInUser(user) : handleSignedOutUser();
});

/**
 * Deletes the user's account.
 */
var deleteAccount = function(firebaseStorage) {
  firebase.auth().currentUser.delete().catch(function(error) {
    if (error.code === 'auth/requires-recent-login') {
      window.alert('Please sign-in and try again.');
      firebase.auth().signOut();
    }
  });
};

var savePost = function() {
  var content = document.getElementById('content').value;
  var uid = document.getElementById('uid').textContent;
  var authorName = document.getElementById('name').textContent;
  var photoURL = document.getElementById('user-photo').src;
  var time = new Date().getTime().toString()
  var data = {
    author_uid: uid,
    author_name: authorName,
    photo_url: photoURL,
    content: content,
    posted_at: time,
  }
  firebase.firestore().collection('/posts').doc(`${uid}+${time}`).set(data).then(function(){
  })
};

var fetchPosts = function() {
  var query = firebase.firestore()
    .collection('posts')
    .orderBy('posted_at', 'desc')
    .limit(50);
  var posts = [];
  query.get().then(function(querySnapshot) {
    querySnapshot.forEach(function(documentSnapshot) {
      var data = documentSnapshot.data();
      renderPost(data);
    });
  })
};

var renderPost = function(data) {
  var firehose = document.getElementById('firehose');
  var post = document.createElement("div");
  post.className = "fp-post";
  var ptag = document.createElement("p");
  var content = document.createTextNode(JSON.stringify(data.content));
  ptag.appendChild(content)
  post.appendChild(ptag);
  firehose.appendChild(post);
}

/**
 * Initializes the app.
 */
var initApp = function() {
  document.getElementById('sign-out').addEventListener(
      'click', function() {
        firebase.auth().signOut();
      }
  );
  document.getElementById('delete-account').addEventListener(
      'click', function() {
        deleteAccount();
      }
  );
  document.getElementById('new-post').onsubmit = function(form) {
    savePost();
  };
};

window.addEventListener('load', initApp);
