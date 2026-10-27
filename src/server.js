const createApp = require('./app');
const getStore = require('./store');

const port = process.env.PORT || 3000;
const app = createApp(getStore());

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
