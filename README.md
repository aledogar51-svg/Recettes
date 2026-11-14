# Mes recettes

Ce dépôt GitHub contient **uniquement l'appli, sans aucune recette dedans**. Les recettes sont des **Google Docs** rangés dans ton dossier Drive « Recettes ». Le planning se trouve dans un **Google Sheet privé** et il est recopié dans un agenda Google « Repas ». Sans le **code secret**, on ne voit rien.

```
GitHub Pages (public)              Google Sheet + Apps Script (privé, ton compte)
index.html, app.js, icônes  ──►   lit le dossier Drive « Recettes » (1 Doc = 1 recette)
appli vide                         importe une recette depuis un lien
                            ◄──   planning partagé + agenda « Repas »
```

Tous ceux qui ont le code voient **les mêmes recettes et le même planning**. Si ta femme planifie un plat, il apparaît chez toi dans l'appli et dans ton agenda.

---

## Étape 1 : Mettre l'appli sur GitHub Pages

1. Sur github.com, crée un dépôt **public**, par exemple `Recettes`.
2. Clique sur **Add file → Upload files** et glisse **tout le contenu du dossier**. Le dossier `backend` peut y aller aussi, il ne contient rien de personnel.
3. Va dans **Settings → Pages**. Dans « Source », choisis **Deploy from a branch**, puis la branche `main` et le dossier `/ (root)`, et clique sur Save.
4. Une à deux minutes plus tard, l'appli est en ligne à l'adresse `https://aledogar51-svg.github.io/Recettes/`.

## Étape 2 : Créer la partie privée (Google Sheet)

1. Sur drive.google.com, crée un **nouveau Google Sheet**, par exemple « Mes recettes – privé ».
2. Dans le menu **Extensions**, choisis **Apps Script**. Efface le code présent et colle **tout le contenu de `backend/Code.gs`**, puis enregistre (💾).
3. Dans la liste des fonctions en haut, choisis **`installer`** et clique sur **Exécuter**.
   - Google demande des autorisations (Drive, Docs, Agenda, accès web pour les imports). Clique sur *Examiner les autorisations*, choisis ton compte, puis *Paramètres avancés* et *Accéder au projet (non sécurisé)*. C'est normal, car c'est ton propre script. Valide ensuite.
   - Le script crée :
     - l'onglet **Réglages**, qui contient le **code secret** ;
     - les onglets **Planning** et **Index** (Index se remplit tout seul, n'y touche pas) ;
     - le dossier Drive **« Recettes »** (ou il réutilise celui qui existe déjà), avec une recette exemple ;
     - l'agenda Google **« Repas »**.
4. Clique sur **Déployer → Nouveau déploiement**. Avec la roue ⚙️, choisis **Application Web**, puis :
   - *Exécuter en tant que* : **Moi**
   - *Qui a accès* : **Tout le monde** (l'accès reste protégé par le code secret)
   - Clique sur Déployer et **copie l'URL** (elle se termine par `/exec`).
5. Sur GitHub, ouvre `app.js`, clique sur le crayon ✏️ et colle l'URL à la ligne :
   ```js
   const SCRIPT_URL = 'https://script.google.com/macros/s/……/exec';
   ```
   Clique ensuite sur **Commit changes**.

> Si tu modifies plus tard `Code.gs`, passe par *Déployer → Gérer les déploiements → ✏️ → Nouvelle version*. L'URL ne change pas.

## Étape 3 : Installer sur le S24

1. Ouvre `https://aledogar51-svg.github.io/Recettes/#code=TONCODE` dans **Chrome**.
2. Touche ⋮ puis **« Ajouter à l'écran d'accueil »** (ou « Installer l'application »).
3. Va dans ⚙️ **Réglages** et indique ton prénom : c'est lui qui s'affiche dans le planning.

Bonus Android : une fois l'appli installée, sur une page de recette (Cookomix, Marmiton…), touche **Partager → Recettes**. L'appli s'ouvre directement sur l'import.

## Étape 4 : Donner l'accès à ta femme

1. **L'appli** : envoie-lui le lien avec le code (`…/recettes/#code=TONCODE`).
   - Android : Chrome → ⋮ → « Ajouter à l'écran d'accueil ».
   - iPhone : Safari → Partager → « Sur l'écran d'accueil ». À la première ouverture depuis l'icône, l'appli demande le code : elle le saisit une fois.
   - Elle indique **son prénom** dans ⚙️ Réglages.

   Elle n'a besoin d'aucune autorisation Google : le script travaille avec ton compte.
2. **L'agenda « Repas »** (pour voir les repas dans son propre Google Agenda) : sur calendar.google.com (ordinateur), passe la souris sur « Repas » → ⋮ → **Paramètres et partage** → *Partager avec des personnes en particulier* → ajoute son adresse avec **« Apporter des modifications aux événements »**. Elle reçoit un e-mail pour l'ajouter.
3. **Optionnel, le dossier « Recettes »** : partage-le avec elle en **Éditeur** si elle veut aussi corriger ou écrire des recettes dans Google Docs.

Le résultat : tout ce que l'un de vous planifie apparaît chez l'autre, dans l'appli (onglet Planning) et dans l'agenda.

---

## Le format d'une recette (Google Doc)

Le titre du Doc devient le titre de la recette. Le haut du Doc contient des lignes « Clé : valeur », puis viennent les sections. Les listes à puces ou numérotées de Google Docs fonctionnent aussi.

```
Titre : Lasagnes maison
Catégorie : Plat            (Plat, Entrée, Dessert, Boisson, Apéro, Boulangerie…)
Appareil : Thermomix        (Thermomix, Cookeo, Air fryer, Classique, ou « Thermomix + four »)
Portions : 6
Préparation : 30 min
Cuisson : 45 min
Source : https://…          (lien d'origine, active le bouton Bring!)
Photo : https://…           (lien direct vers une image, facultatif)
Poids portion : 982 g       (facultatif ; sinon estimé à partir des ingrédients)
Calories : 889 kcal         (par portion, facultatif)
Lipides : 37 g              (facultatif, comme Glucides et Protéines)

INGRÉDIENTS
Bolognaise :
- 600 g bœuf haché
- 700 g coulis de tomate
Béchamel :
- 75 cl lait

ÉTAPES
1. Mixer l'oignon — 5 sec / vitesse 5
2. Ajouter le bœuf et le coulis — 20 min / 100 °C / sens inverse / vitesse 1
3. Monter les lasagnes et enfourner 45 min à 180 °C.

NOTES
Meilleure réchauffée le lendemain.
```

- Les **réglages** placés après un tiret long ` — ` (ou ` -- `), séparés par `/`, s'affichent en gros dans le mode cuisine. Pour le Cookeo, ça donne par exemple : `— Dorer / 5 min`.
- Sans tiret, l'appli repère quand même « 20 min », « 100 °C », « vitesse 1 », « Varoma » ou « sens inverse » dans le texte.
- Les quantités en début de ligne (`600 g`, `½`, `1,5`) sont **recalculées** quand tu changes le nombre de personnes.
- Après avoir modifié un Doc, touche ⟳ dans l'appli : elle ne relit que les recettes modifiées.

## Bring!

- **Recette avec une Source** (importée d'un site) : le bouton 🛒 ouvre Bring! et importe les ingrédients avec le nombre de personnes choisi. Ça fonctionne si le site d'origine est compatible avec l'import Bring!, ce qui est le cas de la plupart des grands sites de recettes.
- **Recette sans lien** (carnet, recette perso) : le bouton 🛒 ouvre le menu « Partager » d'Android avec la liste d'ingrédients. Choisis Bring! si l'appli le propose, sinon la liste est copiée et tu n'as plus qu'à la coller dans Bring!.
