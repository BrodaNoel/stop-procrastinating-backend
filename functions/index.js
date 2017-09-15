'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const express = require('express');
const cors = require('cors')({ origin: true });
const app = express();
app.use(cors);
const URL = require('url');

// Response Example
// Error: { status: 'error', error: { id: 'xxx/yyy', message: 'Everything is broken!' } }
// Success: { status: 'ok'[, data: <Mixed>] }

app.post('/sites/report', (req, res) => {
  try {
    const url = URL.parse(req.body.url, true);

    if (typeof url.hostname === 'string' && url.hostname.length > 0) {
      // "." are not allowed.
      // https://www.firebase.com/docs/web/guide/understanding-data.html#section-creating-references
      // So, replace the `.` (in the domain) for `+`
      const domain = url.hostname.replace(/\./g, '+');
      admin.database().ref(`/domains`).child(domain).child(`reported/urls`).push(url.href);

      res.send({
        status: 'ok'
      });

    } else {
      res.send({
        status: 'error',
        error: {
          id: 'sites/report',
          message: 'Invalid URL'
        }
      });
    }

  } catch (e) {
    res.send({
      status: 'error',
      error: {
        id: 'sites/report',
        message: 'URL can not be reported',
        native: e.message
      }
    });
  }
});

exports.api = functions.https.onRequest(app);
