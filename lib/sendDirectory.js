const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const authGmail = require("./authGmail");
const path = require('path')

const MailComposer = require("nodemailer/lib/mail-composer");

module.exports = async function(email, time) {
  const auth = await authGmail();
  const files = fs.readdirSync("../output");
  const attachments = files
    .filter(name => name.length > 4)
    .map(filename => ({
      filename,
      content: fs
        .readFileSync(path.join("..", "output", filename))
        .toString("base64"),
      encoding: "base64"
    }));

  let mail = new MailComposer({
    to: email,
    text:
      'This is an automated test of entering on Decentraland.\n\nDuring the experience, these are the photos and screenshots I took.\n\nI hope you find them OK.\n\nAdditionally, please see the attached console output named "console.txt"',
    html:
      `Hi all,<p>I conducted an automated exploration of the Decentraland world.</p><p>During this experience, I took some pictures that I wanted to share with you. I hope you find them useful. Additionally, you can check out the attached console output in a file named "console.txt". For the record, I spent ${time} seconds waiting for the loading screen to disappear after I was logged in.</p><p>Please note that my machine is not very powerful and you might have a much better experience using the world explorer in your rig.</p><p>Best,<br/>Bot Faker</p><p>`,
    subject: "[QA] Automated pictures taken from the Metaverse",
    textEncoding: "base64",
    attachments
  });

  mail.compile().build((error, msg) => {
    if (error) return console.log("Error compiling email " + error);

    const encodedMessage = Buffer.from(msg)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const gmail = google.gmail({ version: "v1", auth });
    gmail.users.messages.send(
      {
        userId: "me",
        resource: {
          raw: encodedMessage
        }
      },
      (err, result) => {
        if (err)
          return console.log("NODEMAILER - The API returned an error: " + err);

        console.log(
          "NODEMAILER - Sending email reply from server:",
          result.data
        );
      }
    );
  });
};
