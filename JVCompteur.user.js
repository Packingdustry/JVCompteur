// ==UserScript==
// @name         JVCompteur
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Numérote les messages d'un topic JVC (fix doublons et citations)
// @author       Packingdustry
// @match        *://*.jeuxvideo.com/forums/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jeuxvideo.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function injecterCompteurs() {
        // On sélectionne toutes les div dont l'ID commence par "message-"
        const elements = document.querySelectorAll('div[id^="message-"]');

        // On filtre avec une expression régulière pour ne garder que ceux suivis de chiffres purs
        // Cela exclut les éventuels "message-form" ou "message-erreur"
        const messages = Array.from(elements).filter(el => /^message-\d+$/.test(el.id));

        if (messages.length > 0) {
            messages.forEach((message, index) => {
                // Évite de numéroter en double
                if (message.querySelector('.jvc-custom-counter')) return;

                const numero = index + 1;

                // Création du badge
                const badge = document.createElement('span');
                badge.className = 'jvc-custom-counter';
                badge.textContent = `#${numero}`;

                // Style bien visible
                badge.style.fontWeight = 'bold';
                badge.style.color = '#9e9e9e';
                badge.style.backgroundColor = '#ffffff00'; // Fond transparent
                badge.style.padding = '2px 6px';
                badge.style.borderRadius = '4px';
                badge.style.marginLeft = '10px';
                badge.style.marginRight = '10px';
                badge.style.fontSize = '1em';
                badge.style.display = 'inline-block';
                badge.style.verticalAlign = 'middle';

                // On cible la zone d'actions
                const cibleActions = message.querySelector('.messageUser__headerActions');

                if (cibleActions) {
                    cibleActions.prepend(badge);
                } else {
                    // Repli de sécurité pour les messages supprimés (qui n'ont pas de boutons d'action)
                    message.insertBefore(badge, message.firstChild);
                }
            });
        }
    }

    // Lance l'injection immédiatement, puis toutes les secondes
    injecterCompteurs();
    setInterval(injecterCompteurs, 1000);
})();