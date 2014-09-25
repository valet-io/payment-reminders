'use strict';

var fs = require('fs');

fs.writeFile('config.json', JSON.stringify({
  api: process.env.API,
  app: process.env.APP,
  iron: {
    project_id: process.env.IRON_PROJECT_ID,
    token: process.env.IRON_TOKEN
  }
}));
