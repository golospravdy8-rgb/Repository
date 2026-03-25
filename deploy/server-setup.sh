#!/bin/bash
# ============================================================
# BASKET-LVIV — Server Hardening + Setup Script
# Сервер: 191.96.94.187 (Ubuntu 22.04)
# Запускати як root!
# ============================================================
set -e

echo "============================================"
echo " КРОК 1 — Оновлення системи"
echo "============================================"
apt update && apt upgrade -y

echo "============================================"
echo " КРОК 2 — Створення deploy користувача"
echo "============================================"
if ! id "deploy" &>/dev/null; then
  adduser --disabled-password --gecos "" deploy
  usermod -aG sudo deploy
  mkdir -p /home/deploy/.ssh
  cp /root/.ssh/authorized_keys /home/deploy/.ssh/
  chown -R deploy:deploy /home/deploy/.ssh
  chmod 700 /home/deploy/.ssh
  chmod 600 /home/deploy/.ssh/authorized_keys
  echo "deploy ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose, /usr/local/bin/docker-compose" >> /etc/sudoers.d/deploy
  echo "User 'deploy' created."
else
  echo "User 'deploy' already exists, skipping."
fi

echo "============================================"
echo " КРОК 3 — Зміна SSH порту + захист"
echo "============================================"
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

cat > /etc/ssh/sshd_config << 'EOF'
Port 2299
Protocol 2
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

systemctl restart sshd
echo "SSH hardened. New port: 2299"
echo "!!! ПЕРЕВІР підключення з іншого терміналу: ssh -p 2299 deploy@191.96.94.187 !!!"
read -p "Натисни Enter щоб продовжити після перевірки..."

echo "============================================"
echo " КРОК 4 — Fail2ban"
echo "============================================"
apt install -y fail2ban

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = 2299
logpath = %(sshd_log)s
backend = %(sshd_backend)s
EOF

systemctl enable fail2ban
systemctl restart fail2ban
echo "Fail2ban configured."

echo "============================================"
echo " КРОК 5 — iptables"
echo "============================================"
apt install -y iptables-persistent

# Скидаємо всі правила
iptables -F INPUT
iptables -F OUTPUT
iptables -F FORWARD

# Дозволяємо встановлені з'єднання
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Дозволяємо localhost
iptables -A INPUT -i lo -j ACCEPT

# SSH (новий порт)
iptables -A INPUT -p tcp --dport 2299 -j ACCEPT

# HTTP/HTTPS (для Traefik/Coolify)
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Coolify dashboard
iptables -A INPUT -p tcp --dport 8000 -j ACCEPT

# ICMP (ping) — залишаємо для діагностики
iptables -A INPUT -p icmp -j ACCEPT

# Блокуємо все інше
iptables -A INPUT -j DROP

# Зберігаємо
netfilter-persistent save
echo "iptables configured."

echo "============================================"
echo " КРОК 6 — Автоматичні оновлення безпеки"
echo "============================================"
apt install -y unattended-upgrades
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
systemctl enable unattended-upgrades
echo "Auto-upgrades enabled."

echo "============================================"
echo " КРОК 7 — Встановлення Docker"
echo "============================================"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker deploy
  systemctl enable docker
  echo "Docker installed."
else
  echo "Docker already installed."
fi

echo "============================================"
echo " КРОК 8 — Директорії для проєкту і бекапів"
echo "============================================"
mkdir -p /opt/basket-lviv
mkdir -p /opt/backups/basket-lviv
chown -R deploy:deploy /opt/basket-lviv
chown -R deploy:deploy /opt/backups
echo "Directories created."

echo "============================================"
echo " КРОК 9 — Cron для бекапів і Docker cleanup"
echo "============================================"
(crontab -l 2>/dev/null; echo "0 3 * * * bash /opt/basket-lviv/deploy/backup.sh >> /var/log/basket-backup.log 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "0 2 * * 0 docker system prune -af --filter 'until=168h' >> /var/log/docker-prune.log 2>&1") | crontab -
echo "Cron jobs added."

echo ""
echo "============================================"
echo " ГОТОВО! Сервер захардений."
echo "============================================"
echo ""
echo " Наступні кроки:"
echo " 1. Встановити Coolify: curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash"
echo " 2. Відкрити панель: http://191.96.94.187:8000"
echo " 3. Задеплоїти проєкт через Coolify"
echo ""
