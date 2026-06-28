/**
 * PM2 Ecosystem Configuration for SmarticketS
 * ==============================================
 * Usage:
 *   pm2 start ecosystem.config.js          # Start all services
 *   pm2 start ecosystem.config.js --only kiosk-service  # Start only kiosk
 *   pm2 restart all                        # Restart all
 *   pm2 logs                               # View logs
 *   pm2 monit                              # Monitor dashboard
 *   pm2 save                               # Save process list for auto-restart on reboot
 *   pm2 startup                            # Generate startup script (systemd)
 *
 * Install PM2 globally:
 *   npm install -g pm2
 */
module.exports = {
  apps: [
    // ── Kiosk WebSocket Service (port 3004) ──
    {
      name: 'kiosk-service',
      script: 'index.ts',
      cwd: __dirname + '/mini-services/kiosk-service',
      interpreter: 'bun',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
        CORS_ORIGIN: 'http://localhost:3000',
      },
      instances: 1,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 2000,
      max_memory_restart: '256M',
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: __dirname + '/.zscripts/mini-service-kiosk-service-error.log',
      out_file: __dirname + '/.zscripts/mini-service-kiosk-service-out.log',
      merge_logs: true,
      time: true,
    },

    // ── Alert Engine Service (port 3003) ──
    {
      name: 'alert-service',
      script: 'index.ts',
      cwd: __dirname + '/mini-services/alert-service',
      interpreter: 'bun',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        CORS_ORIGIN: 'http://localhost:3000',
        DATABASE_URL: 'file:' + __dirname + '/db/smartickets.db',
      },
      instances: 1,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 2000,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: __dirname + '/.zscripts/mini-service-alert-service-error.log',
      out_file: __dirname + '/.zscripts/mini-service-alert-service-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
