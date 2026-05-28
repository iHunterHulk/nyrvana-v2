module.exports = {
  apps: [
    {
      name: 'nyrvana-v2',
      script: 'src/server.ts',
      interpreter: 'bun',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}