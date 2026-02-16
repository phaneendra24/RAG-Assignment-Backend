#!/bin/bash

# Arguments
DOMAIN=$1
EMAIL=$2
PORT=5001

# Check arguments
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: ./setup_https.sh <domain> <email>"
    echo "Example: ./setup_https.sh api.phaneendra.cloud your@email.com"
    exit 1
fi

echo "Setting up HTTPS for $DOMAIN on port $PORT..."

# 1. Install Nginx and Certbot
echo "Installing Nginx and Certbot..."
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 2. Configure Nginx Proxy
echo "Configuring Nginx..."
CONFIG_FILE="/etc/nginx/sites-available/$DOMAIN"

sudo tee $CONFIG_FILE > /dev/null <<EOF
server {
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -sf $CONFIG_FILE /etc/nginx/sites-enabled/
sudo nginx -t

# 3. Reload Nginx
sudo systemctl reload nginx

# 4. Obtain SSL Certificate
echo "Obtaining SSL Certificate..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

echo "--------------------------------------------------"
echo "Setup Complete!"
echo "Your app should now be available at: https://$DOMAIN"
echo "--------------------------------------------------"
