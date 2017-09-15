# Stop Procrastinating - Backend
This repo contains the backend to receive the sites reported as procrasters

# Endpoints
* Report: `/api/sites/report`

# Models

```javascript
{
  domains: {
    'noel.com': {
      reported: {
        urls: [
          'test.noel.com:8080/foo/bar/123',
          'test.noel.com:8080/foo/bar/912' // ...
        ]
      }
    }
  }
}
```
