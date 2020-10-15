const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.compose"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "token.json";

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question("Enter the code from that page here: ", code => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
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
          const start = "Welcome to Decentraland! Your verification code is: "
            .length;
          console.log(response["data"].snippet);
          return resolve(response["data"].snippet.slice(start, start + 4));
        });
      }
    );
  }
  check();
}

module.exports = function(email, time, retry) {
  return new Promise((resolve, reject) => {
    // Load client secrets from a local file.
    fs.readFile("credentials.json", (err, content) => {
      if (err) return reject("Error loading client secret file:", err);
      // Authorize a client with credentials, then call the Gmail API.
      authorize(JSON.parse(content), auth =>
        getCode(auth, email, time, resolve, reject, retry)
      );
    });
  });
};
