const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

// ({ auth, email, time, retry })
const getAuth = require('./authGmail');

module.exports = function(email, time, retry) {
  return new Promise((resolve, reject) => {
      getAuth().then(auth => {
          getCode(auth, email, time, resolve, reject, retry)
      }).catch(reject)
  })
}

function getCode(auth, email, time, resolve, reject, retry) {
  const gmail = google.gmail({ version: "v1", auth });
  var timeout = 5000;
  function check() {
    gmail.users.messages.list(
      {
        userId: "me",
        q: `to: ${email} after: ${time}`
      },
      (err, response) => {
        console.log("checking...");
        if (err) return reject("The API returned an error: " + err);
        if (!response["data"]["messages"]) {
          timeout *= 1.5;
          console.log(`no new emails, waiting for ${Math.floor(timeout)}...`);
          retry()
          return setTimeout(check, timeout);
        }
        const message_id = response["data"]["messages"][0]["id"];
        console.log("email, with id " + message_id);
        // Retreive the actual message using the message id
        gmail.users.messages.get({ userId: "me", id: message_id }, function(
          err,
          response
        ) {
          if (err) {
            console.log("The API returned an error: " + err);
            return reject(err);
          }
          const code = /([\d]+)[^\d]/g
          console.log(response["data"].snippet);
          return resolve(code.exec(response["data"].snippet)[1]);
        });
      }
    );
  }
  check();
}
