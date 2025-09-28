const express = require("express");
const Imap = require("node-imap");
const inspect = require("util").inspect;
const cors = require("cors");

const app = express();
app.use(cors());

const imap = new Imap({
  user: "your-email@gmail.com",
  password: "your-app-password", // Gmail requires an App Password, not your normal one
  host: "imap.gmail.com",
  port: 993,
  tls: true
});

function openInbox(cb) {
  imap.openBox("INBOX", true, cb);
}

// API route to fetch messages
app.get("/messages", (req, res) => {
  let messages = [];

  imap.once("ready", function () {
    openInbox(function (err, box) {
      if (err) throw err;
      const f = imap.seq.fetch("1:10", {
        bodies: ["HEADER.FIELDS (FROM SUBJECT DATE)", "TEXT"],
        struct: true
      });
      f.on("message", function (msg, seqno) {
        let email = {};
        msg.on("body", function (stream, info) {
          let buffer = "";
          stream.on("data", function (chunk) {
            buffer += chunk.toString("utf8");
          });
          stream.on("end", function () {
            if (info.which === "TEXT") {
              email.body = buffer;
            } else {
              email.header = Imap.parseHeader(buffer);
            }
          });
        });
        msg.once("attributes", function (attrs) {
          email.attrs = attrs;
        });
        msg.once("end", function () {
          messages.push(email);
        });
      });
      f.once("end", function () {
        res.json(messages);
        imap.end();
      });
    });
  });

  imap.once("error", function (err) {
    console.log(err);
  });

  imap.connect();
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
