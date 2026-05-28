# Nyrvana V2 Deployment

This directory contains deployment configurations for Nyrvana V2 API.

## Integration with Homelab Traefik

1. Ensure the `nyrvana_net` network exists in your Docker environment:
   ```bash
   docker network create nyrvana_net || true
   ```

2. Copy or symlink the Traefik configuration file to your Traefik dynamic configs directory:
   ```bash
   cp deploy/traefik/nyrvana-v2.yml /path/to/traefik/dynamic/configs/
   ```

3. Start the service using the provided docker-compose file:
   ```bash
   docker-compose -f deploy/docker-compose.yml up -d
   ```

## Rollback

To rollback to the previous deployment, simply revert this commit:
```bash
git revert HEAD
```
Then redeploy with the updated configuration.