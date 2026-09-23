// PM2 process definition.
// Named .cjs (not .js) because package.json has "type": "module".
// Run:  pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "tether-watch",
      script: "dist/main.js",
      cwd: "/var/www/tether-watch",

      // IMPORTANT: single fork instance — the app owns cron jobs (croner).
      // Cluster / multiple instances would fire the scheduler N times and
      // post duplicate messages to the channel.
      exec_mode: "fork",
      instances: 1,

      autorestart: true,
      max_memory_restart: "300M",

      // The app reads .env from `cwd` via dotenv, so nothing secret goes here.
      env: {
        NODE_ENV: "production",
      },

      // journald-style timestamps in `pm2 logs`
      time: true,
    },
  ],
};
