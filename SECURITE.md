# 🔒 Guide de Sécurité

## ⚠️ IMPORTANT - À lire avant de commiter ou partager

### 🚨 Données sensibles à JAMAIS commiter

**Ne commitez JAMAIS ces informations:**
- ❌ Tokens Telegram (Bot Token)
- ❌ Chat IDs Telegram
- ❌ Clés API privées
- ❌ Mots de passe
- ❌ Adresses de wallets privées
- ❌ Fichiers .env avec vraies valeurs

### ✅ Bonnes pratiques

1. **Utiliser les variables d'environnement**
   ```bash
   # Créer un fichier .env (ignoré par git)
   cat > .env << 'ENVEOF'
   TELEGRAM_BOT_TOKEN=votre_vrai_token_ici
   TELEGRAM_CHAT_ID=votre_vrai_chat_id_ici
   CHECK_FREQUENCY=30
   ENVEOF
   
   # Charger les variables
   source .env
   export TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID CHECK_FREQUENCY
   ```

2. **Vérifier avant de commit**
   ```bash
   # Vérifier qu'aucune donnée sensible n'est présente
   git diff | grep -i "token\|password\|secret\|key"
   
   # Si des données sensibles apparaissent, NE PAS commiter!
   ```

3. **Si vous avez accidentellement commité des secrets**
   ```bash
   # OPTION 1: Modifier le dernier commit (si pas encore pushé)
   git reset --soft HEAD~1
   # Retirer les secrets, puis recommit
   
   # OPTION 2: Si déjà pushé - REGÉNÉRER TOUS VOS TOKENS
   # Les secrets sont compromis, il faut:
   # 1. Créer un nouveau bot Telegram via @BotFather
   # 2. Obtenir un nouveau token
   # 3. Mettre à jour votre configuration
   ```

4. **Révoquer un token Telegram compromis**
   - Allez sur [@BotFather](https://t.me/BotFather)
   - Envoyez `/mybots`
   - Sélectionnez votre bot
   - Choisissez "API Token" → "Revoke current token"
   - Vous recevrez un nouveau token

### 📋 Checklist avant chaque commit

- [ ] Vérifier qu'aucun token n'est en dur dans le code
- [ ] Le fichier .env est bien dans .gitignore
- [ ] Les exemples utilisent des placeholders (VOTRE_TOKEN_ICI)
- [ ] Pas de vrais Chat IDs dans le code
- [ ] Exécuter: `git diff | grep -E "[0-9]{10}:[A-Za-z0-9_-]{35}"`

### 🛡️ Protection du VPS

1. **Permissions des fichiers**
   ```bash
   # Sécuriser le fichier .env
   chmod 600 .env
   
   # Sécuriser les scripts
   chmod 700 *.sh
   chmod 600 solana_monitor_vps.js
   ```

2. **Firewall VPS**
   ```bash
   # Autoriser seulement SSH
   sudo ufw allow 22
   sudo ufw enable
   sudo ufw status
   ```

3. **Authentification SSH par clé (désactiver mot de passe)**
   ```bash
   # Sur votre machine locale
   ssh-keygen -t ed25519 -C "votre_email@example.com"
   ssh-copy-id user@vps_ip
   
   # Sur le VPS, désactiver auth par mot de passe
   sudo nano /etc/ssh/sshd_config
   # Modifier: PasswordAuthentication no
   sudo systemctl restart sshd
   ```

4. **Mise à jour automatique du VPS**
   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt upgrade -y
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure --priority=low unattended-upgrades
   ```

### 🔍 Vérification régulière

```bash
# Chercher des patterns de secrets dans tout le projet
grep -r "token.*=" --include="*.js" --include="*.html" .
grep -r "[0-9]\{10\}:[A-Za-z0-9_-]\{35\}" . 2>/dev/null | grep -v ".git"

# Si quelque chose apparaît → NETTOYER IMMÉDIATEMENT
```

### 📝 En cas de fuite de secrets

1. **Révoquer IMMÉDIATEMENT** tous les tokens compromis
2. **Générer de nouveaux tokens**
3. **Vérifier les logs** Telegram pour activité suspecte
4. **Changer tous les mots de passe** associés
5. **Examiner l'historique git** pour nettoyer
6. **Considérer** un force push après nettoyage (DANGEREUX)

### ✅ État actuel du projet

- ✅ Pas de tokens hardcodés dans le code
- ✅ .gitignore configuré correctement
- ✅ .env.example fourni avec placeholders
- ✅ Documentation utilise des exemples génériques
- ✅ Variables d'environnement requises (pas de fallbacks)

---

**Rappel:** La sécurité est votre responsabilité. En cas de doute, NE PAS commiter!
