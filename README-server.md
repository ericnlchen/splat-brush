cloudflare proxy is active and bypass cache is turned ON

set up nginx reverse proxy with the following and copy splatbrush.app.nginx into the actual nginx config:
nginx takes 443 HTTPS request, validates the SSL and redirects to local HTTP server on port 3000

    sudo apt install nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    sudo ufw allow 'Nginx Full'

    sudo vi /etc/nginx/sites-available/splatbrush.app
    sudo ln -s /etc/nginx/sites-available/splatbrush.app /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx

and put the origin CA cert/key into cert/

to start the server (persistent through pm2):

    pm2 start ecosystem.config.js
