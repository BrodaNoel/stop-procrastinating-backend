'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const express = require('express');
const cors = require('cors')({ origin: true });
const app = express();
app.use(cors);
const URL = require('url');

const toBase64 = text => {
  return new Buffer(text).toString('base64');
};

const fromBase64 = base64 => {
  return new Buffer(base64, 'base64').toString('ascii');
};

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

app.get('/moderation/pending', (req, res) => {
  try {
    let pendingRef = admin.database().ref(`/reported/domains`).orderByKey().limitToFirst(1);

    pendingRef.once('value').then(domain => {
      if (domain.val() === null) {
        res.send({
          status: 'ok',
          data: { domain: {} }
        });
        return;
      }

      const key = Object.keys(domain.val())[0];

      let data = {
        domain: {
          name: key.replace(/\+/g, '.'),
          rules: {
            pending: domain.val()[key].urls
          }
        }
      };

      let rulesRef = admin.database().ref(`/rules/domains`).child(key).child('/rules');

      rulesRef.once('value').then(rules => {
        data.domain.rules.current = rules.val() || {};

        res.send({
          status: 'ok',
          data
        });
        return;
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
    // TODO: Add more validations here.
    if (typeof req.body.domain === 'string' && req.body.domain.length > 0) {
      const domain = req.body.domain.replace(/\./g, '+');
      const subDomain = req.body.subDomain.replace(/\./g, '+');
      const path = toBase64(req.body.path);
      const selector = req.body.selector;

      // "." are not allowed.
      // https://www.firebase.com/docs/web/guide/understanding-data.html#section-creating-references
      // So, replace the `.` (in the domain) for `+`
      admin.database()
        .ref(`/rules/domains`)
        .child(domain)
        .child('/subDomains')
        .child(subDomain)
        .child(path)
        .push(selector);

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

app.post('/moderation/remove', (req, res) => {
  try {
    const domain = req.body.domain.replace(/\./g, '+');
    // "." are not allowed.
    // https://www.firebase.com/docs/web/guide/understanding-data.html#section-creating-references
    // So, replace the `.` (in the domain) for `+`
    admin.database().ref(`/reported/domains`).child(domain).child(`/urls`).child(req.body.urlId).remove();

    res.send({
      status: 'ok'
    });

  } catch (e) {
    res.send({
      status: 'error',
      error: {
        id: 'moderation/remove',
        message: 'URL can not be removed',
        native: e.message
      }
    });
  }
});

app.post('/rules/generateFile', (req, res) => {
  try {
    let data = {
      "expire": 5,
      "schemaVersion": 1,
      "generics": [],
      "domains": {}
    };

    let rulesRef = admin.database().ref(`/rules`);

    rulesRef.once('value').then(rules => {
      const domains = rules.val().domains;

      Object.keys(domains).forEach(domainKey => {
        const domain = domainKey.replace(/\+/g, '.');

        if (!data.domains[domain]) {
          data.domains[domain] = {
            subDomains: {}
          };
        }

        if (domains[domainKey].disabled) {
          data.domains[domain].disabled = true;
        }

        const subDomains = domains[domainKey].subDomains;
        Object.keys(subDomains).forEach(subDomainKey => {
          const subDomain = subDomainKey.replace(/\+/g, '.');

          if (!data.domains[domain].subDomains[subDomain]) {
            data.domains[domain].subDomains[subDomain] = {};
          }

          const paths = subDomains[subDomainKey];

          Object.keys(paths).forEach(pathKey => {
            const path = fromBase64(pathKey);
            const selectorsObject = subDomains[subDomainKey][pathKey];
            const selectors = Object.keys(selectorsObject).map(x => selectorsObject[x]);
            data.domains[domain].subDomains[subDomain][path] = selectors;
          });
        });
      });

      res.send({
        status: 'ok',
        data
      });
    });

  } catch (e) {
    res.send({
      status: 'error',
      error: {
        id: 'rules/generateFile',
        message: 'File can not be generated',
        native: e.message
      }
    });
  }
});

exports.api = functions.https.onRequest(app);
