// ==UserScript==
// @name         JVCompteur
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Numérote les messages, preshot dans la sidebar et auto-reload au 20ème
// @author       Packingdustry
// @match        *://*.jeuxvideo.com/forums/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jeuxvideo.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Variable pour traquer le nombre de messages et déclencher l'événement du 20ème
    let dernierCompteMessages = document.querySelectorAll('div[id^="message-"]').length;

    const moisMap = {
        'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
        'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
    };

    function parseDateJVC(dateStr) {
        const regex = /(\d{2})\s([a-zéû]+)\s(\d{4})\sà\s(\d{2}):(\d{2}):(\d{2})/;
        const match = dateStr.match(regex);
        if (!match) return null;

        return new Date(
            parseInt(match[3], 10), moisMap[match[2].toLowerCase()], parseInt(match[1], 10),
            parseInt(match[4], 10), parseInt(match[5], 10), parseInt(match[6], 10)
        ).getTime();
    }

    function formatTime(ms) {
        if (isNaN(ms) || ms < 0) return "--:--";
        const totalSec = Math.floor(ms / 1000);
        return `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`;
    }

    function formatHour(timestamp) {
        if (isNaN(timestamp)) return "--:--:--";
        const d = new Date(timestamp);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    }

    function playBeep() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine'; // Son doux (onde sinusoïdale)
            osc.frequency.setValueAtTime(600, audioCtx.currentTime); // Fréquence agréable

            // Paramétrage du volume avec un petit fondu pour éviter un bruit sec
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            console.log("JVC Preshot: Audio non supporté ou bloqué par le navigateur.");
        }
    }

    function initSidebarUI() {
        let preshotCard = document.getElementById('jvc-preshot-card');
        if (!preshotCard) {
            // On cible la barre latérale droite de JVC
            const sidebar = document.querySelector('.layout__contentAside');
            if (!sidebar) return null;

            // Création de la carte reprenant EXACTEMENT les classes JVC
            preshotCard = document.createElement('div');
            preshotCard.id = 'jvc-preshot-card';
            preshotCard.className = 'sideCardForum';

            // On rend la carte collante (sticky) pour qu'elle suive le scroll
            preshotCard.style.position = 'sticky';
            preshotCard.style.top = '60px'; // Laisse de la place sous le menu supérieur
            preshotCard.style.zIndex = '100';

            preshotCard.innerHTML = `
                <div class="sideCardForum__header">
                    <div class="sideCardForum__headerTitle" style="color: #ff6600;">⏱️ Tracker Preshot</div>
                </div>
                <div class="sideCardForum__body">
                    <div class="sideCardForum__item">
                        <ul class="sideCardForum__list" style="font-weight: bold;">
                            <li class="sideCardForum__listItem">Messages : <span id="preshot-count" style="float: right; color: #ff6600;">--/20</span></li>
                            <li class="sideCardForum__listItem">Moyenne : <span id="preshot-avg" style="float: right; color: #ff6600;">--:--</span></li>
                            <li class="sideCardForum__listItem">Page prevue : <span id="preshot-est" style="float: right; color: #ff6600;">--:--:--</span></li>
                        </ul>
                    </div>
                </div>
            `;
            // On l'insère tout en haut de la barre de droite
            sidebar.prepend(preshotCard);
        }
        return true;
    }

    function updatePreshot(messages) {
        if (!initSidebarUI()) return; // Si la sidebar n'existe pas, on abandonne

        const nbMessages = messages.length;

        document.getElementById('preshot-count').textContent = `${nbMessages}/20`;

        if (nbMessages < 4) {
            document.getElementById('preshot-avg').textContent = "Attente...";
            document.getElementById('preshot-est').textContent = "--:--:--";
            return;
        }

        if (nbMessages >= 20) {
            document.getElementById('preshot-avg').textContent = "Terminé";
            document.getElementById('preshot-est').textContent = "Page pleine";
            return;
        }

        const times = [];
        messages.forEach(msg => {
            const dateEl = msg.querySelector('.messageUser__date');
            if (dateEl) {
                const t = parseDateJVC(dateEl.textContent.trim());
                if (t) times.push(t);
            }
        });

        if (times.length < 4) return;

        const dernierTemps = times[times.length - 1];
        const tempsRef = times[2];
        const nbEcarts = times.length - 3;

        if (nbEcarts <= 0 || dernierTemps < tempsRef) return;

        const moyenneMs = (dernierTemps - tempsRef) / nbEcarts;
        const messagesRestants = 20 - nbMessages;
        const tempsEstimeProchainePage = dernierTemps + (moyenneMs * messagesRestants);

        document.getElementById('preshot-avg').textContent = formatTime(moyenneMs);
        document.getElementById('preshot-est').textContent = formatHour(tempsEstimeProchainePage);
    }

    function executerScript() {
        const elements = document.querySelectorAll('div[id^="message-"]');
        const messages = Array.from(elements).filter(el => /^message-\d+$/.test(el.id));
        const nbMessages = messages.length;

        // Logique de Bip et Auto-Reload
        // On vérifie qu'on passe bien de "moins de 20" à "20 ou plus" pour éviter de recharger en boucle une vieille page
        if (dernierCompteMessages < 20 && nbMessages >= 20) {
            playBeep();
            setTimeout(() => {
                window.location.reload();
            }, 1000); // Recharge la page 1 seconde après le bip
        }
        dernierCompteMessages = nbMessages;

        if (nbMessages > 0) {
            messages.forEach((message, index) => {
                if (message.querySelector('.jvc-custom-counter')) return;

                const numero = index + 1;
                const badge = document.createElement('span');
                badge.className = 'jvc-custom-counter';
                badge.textContent = `#${numero}`;

                badge.style.fontWeight = 'bold';
                badge.style.color = '#9e9e9e';
                badge.style.backgroundColor = '#ffffff00';
                badge.style.padding = '2px 6px';
                badge.style.borderRadius = '4px';
                badge.style.marginLeft = '10px';
                badge.style.marginRight = '10px';
                badge.style.fontSize = '1em';
                badge.style.display = 'inline-block';
                badge.style.verticalAlign = 'middle';

                const cibleActions = message.querySelector('.messageUser__headerActions');

                if (cibleActions) {
                    cibleActions.prepend(badge);
                } else {
                    message.insertBefore(badge, message.firstChild);
                }
            });

            updatePreshot(messages);
        }
    }

    // Lancement
    executerScript();
    setInterval(executerScript, 1000); // Actualisation en temps réel toutes les secondes
})();
