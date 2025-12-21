# 🚀 Tutoriel Complet - Déploiement VPS Automatique

> **Pour demain**: Guide pas-à-pas pour mettre le bot en ligne sur un VPS

---

## 📋 Ce dont vous aurez besoin

### 1. Un VPS (Serveur Privé Virtuel)
**Options recommandées:**

| Fournisseur | Prix/mois | RAM | Lien |
|-------------|-----------|-----|------|
| **Contabo** | ~5€ | 4GB | [contabo.com](https://contabo.com) |
| **Hetzner** | ~4€ | 4GB | [hetzner.com](https://www.hetzner.com) |
| **DigitalOcean** | $6 | 1GB | [digitalocean.com](https://www.digitalocean.com) |
| **OVH** | ~4€ | 2GB | [ovh.com](https://www.ovhcloud.com) |

> 💡 **Recommandation**: Hetzner (excellent rapport qualité/prix, datacenters EU)

### 2. Informations Telegram
- [ ] Bot Token (via @BotFather)
- [ ] Chat ID (via @userinfobot)

### 3. Logiciel sur votre ordinateur
- [ ] Terminal (Mac/Linux) ou PuTTY (Windows)
- [ ] Git installé

---

## 🎯 Étape 1: Créer et configurer le VPS

### A. Commander le VPS

**Chez Hetzner (exemple):**
1. Allez sur [Hetzner Cloud](https://www.hetzner.com/cloud)
2. Créez un compte
3. Créez un nouveau projet
4. Cliquez sur "Add Server"
5. Choisissez:
   - **Location**: Nuremberg (Allemagne) ou Helsinki
   - **Image**: Ubuntu 22.04
   - **Type**: CX11 (2GB RAM, ~4€/mois)
   - **SSH Key**: Créez-en une nouvelle (voir ci-dessous)
6. Cliquez "Create & Buy Now"

### B. Créer une clé SSH (si vous n'en avez pas)

**Sur Mac/Linux:**
```bash
# Créer la clé
ssh-keygen -t ed25519 -C "votre_email@exemple.com"

# Afficher la clé publique (à copier dans Hetzner)
cat ~/.ssh/id_ed25519.pub
```

**Sur Windows (PowerShell):**
```powershell
# Créer la clé
ssh-keygen -t ed25519 -C "votre_email@exemple.com"

# Afficher la clé publique
type $env:USERPROFILE\.ssh\id_ed25519.pub
```

Copiez tout le contenu et collez-le dans Hetzner lors de la création du serveur.

---

## 🎯 Étape 2: Se connecter au VPS

Une fois le VPS créé, Hetzner vous donne une **adresse IP** (ex: 116.203.X.X)

```bash
# Se connecter
ssh root@VOTRE_IP_VPS

# Exemple:
ssh root@116.203.123.45

# Si première connexion, tapez "yes" pour accepter
```

---

## 🎯 Étape 3: Préparer le VPS (premières commandes)

Une fois connecté au VPS, exécutez ces commandes:

```bash
# Mettre à jour le système
apt update && apt upgrade -y

# Installer Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Vérifier l'installation
node --version  # Doit afficher v18.x.x
npm --version   # Doit afficher 9.x.x

# Installer PM2 (gestionnaire de processus)
npm install -g pm2

# Installer Git
apt install -y git

# Créer un utilisateur non-root (sécurité)
adduser solana
# Choisissez un mot de passe et confirmez
# Appuyez sur Entrée pour les autres questions

# Donner les droits sudo
usermod -aG sudo solana

# Passer à l'utilisateur solana
su - solana
```

---

## 🎯 Étape 4: Installer le bot

```bash
# Créer le dossier
mkdir ~/solana-monitor
cd ~/solana-monitor

# Cloner depuis GitHub (si vous avez pushé)
git clone https://github.com/VOTRE_USERNAME/BotSolana.git .

# OU copier manuellement les fichiers (voir section ci-dessous)
```

### Option: Copier les fichiers manuellement

**Depuis votre ordinateur local (nouveau terminal):**
```bash
# Copier tous les fichiers nécessaires
cd ~/Documents/Repositories/BotSolana
scp solana_monitor_vps.js test_vps.js install_vps.sh start_vps.sh .env.example solana@VOTRE_IP_VPS:~/solana-monitor/

# Exemple:
scp solana_monitor_vps.js test_vps.js solana@116.203.123.45:~/solana-monitor/
```

---

## 🎯 Étape 5: Configurer le bot

**Sur le VPS:**

```bash
cd ~/solana-monitor

# Créer le fichier .env avec VOS vraies valeurs
nano .env
```

Dans nano, tapez:
```bash
TELEGRAM_BOT_TOKEN=VOTRE_VRAI_TOKEN_ICI
TELEGRAM_CHAT_ID=VOTRE_VRAI_CHAT_ID_ICI
CHECK_FREQUENCY=30
```

Puis:
- `Ctrl+X` pour quitter
- `Y` pour sauvegarder
- `Entrée` pour confirmer

```bash
# Sécuriser le fichier
chmod 600 .env

# Rendre les scripts exécutables
chmod +x *.sh *.js

# Charger les variables d'environnement
source .env
export TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID CHECK_FREQUENCY
```

---

## 🎯 Étape 6: Tester le bot

```bash
# Test rapide (ne pas faire tourner en continu)
node test_vps.js
```

**Résultat attendu:**
```
🧪 TEST MONITORING SOLANA BOLLINGER BANDS
📊 Tokens: 6
✅ Prix affichés pour chaque token
✅ Bandes de Bollinger calculées
✅ Distance et volume affichés
```

Si tout fonctionne → Passez à l'étape suivante!

---

## 🎯 Étape 7: Lancer le bot 24/7 avec PM2

```bash
# Charger les variables (important!)
source .env
export TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID CHECK_FREQUENCY

# Lancer avec PM2
pm2 start solana_monitor_vps.js --name solana-bb

# Configurer le démarrage automatique au reboot du VPS
pm2 startup
# Copiez et exécutez la commande affichée (commence par sudo...)

# Sauvegarder la configuration PM2
pm2 save
```

**Commandes utiles PM2:**
```bash
pm2 status              # Voir l'état du bot
pm2 logs solana-bb      # Voir les logs en temps réel (Ctrl+C pour quitter)
pm2 restart solana-bb   # Redémarrer le bot
pm2 stop solana-bb      # Arrêter le bot
pm2 delete solana-bb    # Supprimer complètement le bot
```

---

## 🎯 Étape 8: Vérifier que tout fonctionne

### Vérifier les logs
```bash
pm2 logs solana-bb --lines 50
```

Vous devriez voir:
```
🚀 Surveillance Solana démarrée!
📊 Tokens: $67, $NEET, $FRANKLIN, ...
🔄 VÉRIFICATION #1
✅ $67: $0.0337 | Distance: -22.52%
...
```

### Vérifier Telegram
- Vous devriez avoir reçu un message "🚀 Surveillance Solana démarrée!"
- Attendez quelques minutes pour voir si les checks se font

### En cas de problème
```bash
# Voir les erreurs
pm2 logs solana-bb --err

# Redémarrer si besoin
pm2 restart solana-bb

# Vérifier les variables d'env
echo $TELEGRAM_BOT_TOKEN
echo $TELEGRAM_CHAT_ID
```

---

## 🎯 Étape 9: Sécuriser le VPS

```bash
# Configurer le firewall
sudo ufw allow 22/tcp
sudo ufw enable
sudo ufw status

# Désactiver l'authentification root par mot de passe (optionnel mais recommandé)
sudo nano /etc/ssh/sshd_config
# Chercher et modifier:
# PermitRootLogin no
# PasswordAuthentication no
# Ctrl+X, Y, Entrée

# Redémarrer SSH
sudo systemctl restart sshd
```

---

## 🎯 Étape 10: Se déconnecter et partir en vacances! 🏖️

```bash
# Quitter le VPS
exit

# Le bot continue de tourner 24/7!
```

---

## 📱 Surveiller depuis votre téléphone

### Option 1: SSH depuis mobile
- **iOS**: Termius (gratuit)
- **Android**: JuiceSSH (gratuit)

### Option 2: Recevoir seulement les alertes Telegram
- Configurez des notifications pour votre bot Telegram
- Vous recevrez les alertes de breakout où que vous soyez!

---

## 🔧 Maintenance

### Mettre à jour le bot
```bash
# Se connecter au VPS
ssh solana@VOTRE_IP_VPS

cd ~/solana-monitor

# Arrêter le bot
pm2 stop solana-bb

# Mettre à jour le code (si Git)
git pull

# OU copier les nouveaux fichiers depuis votre PC

# Redémarrer
pm2 restart solana-bb
```

### Changer les tokens surveillés
```bash
# Éditer le fichier
nano solana_monitor_vps.js

# Modifier la section TOKENS (ligne ~17)
# Ctrl+X, Y, Entrée

# Redémarrer
pm2 restart solana-bb
```

---

## 💰 Coûts mensuels

| Service | Coût |
|---------|------|
| VPS Hetzner CX11 | ~4€ |
| Bot Telegram | Gratuit |
| API GeckoTerminal | Gratuit |
| **TOTAL** | **~4€/mois** |

---

## ❓ FAQ

**Q: Le bot va consommer beaucoup de ressources?**  
R: Non, ~50MB RAM, CPU quasi nul. Le VPS le plus basique suffit.

**Q: Que se passe-t-il si le VPS redémarre?**  
R: PM2 relance automatiquement le bot (si vous avez fait `pm2 startup`).

**Q: Puis-je arrêter le bot temporairement?**  
R: Oui: `pm2 stop solana-bb`. Pour relancer: `pm2 start solana-bb`

**Q: Comment savoir si le bot tourne encore?**  
R: `pm2 status` ou regardez si vous recevez toujours les checks sur Telegram.

**Q: Les données sont-elles sécurisées?**  
R: Oui, le fichier .env est en chmod 600 (vous seul pouvez le lire).

---

## ✅ Checklist finale

Avant de partir en vacances:

- [ ] VPS créé et accessible
- [ ] Node.js et PM2 installés
- [ ] Bot copié sur le VPS
- [ ] Fichier .env créé avec vraies valeurs
- [ ] Test effectué avec `node test_vps.js`
- [ ] Bot lancé avec PM2
- [ ] `pm2 startup` et `pm2 save` exécutés
- [ ] Message Telegram de démarrage reçu
- [ ] Première vérification visible dans les logs
- [ ] Firewall configuré
- [ ] Tout fonctionne depuis 30 minutes minimum

---

**Prêt pour des vacances sereines! 🏖️🚀**
