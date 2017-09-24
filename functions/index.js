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
      admin.database().ref(`/reported/domains`).child(domain).child(`/urls`).push(url.href);

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

app.get('/moderation/pendings', (req, res) => {
  try {
    let ref = admin.database().ref(`/reported/domains`).orderByKey().limitToFirst(1);

    ref.once('value').then(domain => {
      const key = Object.keys(domain.val())[0];

      let data = {
        domain: {}
      };

      data.domain[key.replace(/\+/g, '.')] = domain.val()[key];

      res.send({
        status: 'ok',
        data
      });
    });

  } catch (e) {
    res.send({
      status: 'error',
      error: {
        id: 'moderation/pendings',
        message: 'Pendings can not be get',
        native: e.message
      }
    });
  }
});

app.post('/moderation/save', (req, res) => {
  try {
    if (typeof req.body.domain === 'string' && req.body.domain.length > 0) {
      const domain = req.body.domain.replace(/\./g, '+');
      // "." are not allowed.
      // https://www.firebase.com/docs/web/guide/understanding-data.html#section-creating-references
      // So, replace the `.` (in the domain) for `+`
      admin.database().ref(`/rules/domains`).child(domain).child(`/rules`).push({
        url: req.body.url,
        selector: req.body.selector
      });

      res.send({
        status: 'ok'
      });

    } else {
      res.send({
        status: 'error',
        error: {
          id: 'moderation/save',
          message: 'Invalid URL'
        }
      });
    }

  } catch (e) {
    res.send({
      status: 'error',
      error: {
        id: 'moderation/save',
        message: 'URL can not be reported',
        native: e.message
      }
    });
  }
});

exports.api = functions.https.onRequest(app);
