document.addEventListener('DOMContentLoaded', () => {
    let isMaster = false;

    // Chargement des données locales
    let localECUs = JSON.parse(localStorage.getItem('ecus') || '{"0281010350":{"family":"EDC15C2","compat":"0281010351, 0281010352"}}');
    let localDF = JSON.parse(localStorage.getItem('renault_df') || '{"DF025":{"p_code":"P0380","desc":"Liaison diagnostic boîtier préchauffage"}}');

    // Éléments du DOM
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (localStorage.getItem('openai_api_key')) {
        apiKeyInput.value = localStorage.getItem('openai_api_key');
    }

    // Gestion de la navigation par onglets
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetTab = e.target.getAttribute('data-tab');

            tabContents.forEach(content => content.classList.add('hidden'));
            tabButtons.forEach(btn => {
                btn.classList.remove('border-b-2', 'border-blue-500', 'text-blue-400', 'font-semibold');
                btn.classList.add('text-gray-400');
            });

            document.getElementById(targetTab).classList.remove('hidden');
            e.target.classList.add('border-b-2', 'border-blue-500', 'text-blue-400', 'font-semibold');
            e.target.classList.remove('text-gray-400');
        });
    });

    // Basculer le mode Master
    const btnToggleMaster = document.getElementById('btnToggleMaster');
    const masterTabBtn = document.getElementById('masterTabBtn');

    btnToggleMaster.addEventListener('click', () => {
        isMaster = !isMaster;
        btnToggleMaster.innerText = isMaster ? "Mode Master ON" : "Mode User";
        masterTabBtn.classList.toggle('hidden', !isMaster);
    });

    // Recherche ECU
    document.getElementById('btnSearchEcu').addEventListener('click', () => {
        const num = document.getElementById('ecuInput').value.trim();
        const res = document.getElementById('ecuResult');
        if (!num) return;

        if (localECUs[num]) {
            res.innerText = `[Local] N° Bosch : ${num}\nFamille : ${localECUs[num].family}\nCompatibilités : ${localECUs[num].compat}`;
        } else {
            queryAI(`Identifie le calculateur Bosch numéro ${num}. Donne sa famille et compatibilités.`, res);
        }
    });

    // Recherche DTC (P-Code et DF Renault)
    document.getElementById('btnSearchPCode').addEventListener('click', () => searchDTC('P'));
    document.getElementById('btnSearchDFCode').addEventListener('click', () => searchDTC('DF'));

    function searchDTC(type) {
        const code = document.getElementById('dtcInput').value.trim().toUpperCase();
        const res = document.getElementById('dtcResult');
        const exportBtns = document.getElementById('dtcExportBtns');
        if (!code) return;

        exportBtns.classList.remove('hidden');

        if (type === 'DF' && localDF[code]) {
            res.innerText = `[Local] Code Renault : ${code}\nÉquivalent Code P : ${localDF[code].p_code}\nDescription : ${localDF[code].desc}`;
        } else {
            queryAI(`Décris le code défaut ${code} (et donne son équivalent Code P si c'est un code DF Renault).`, res);
        }
    }

    // Interrogation API OpenAI (Fallback)
    async function queryAI(prompt, targetEl) {
        const key = localStorage.getItem('openai_api_key');
        if (!key) {
            targetEl.innerText = "Aucune donnée locale. Ajoutez votre clé API OpenAI dans 'Réglages API' pour obtenir une réponse de l'IA.";
            return;
        }
        targetEl.innerText = "Interrogation de l'IA...";
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${key}` 
                },
                body: JSON.stringify({ 
                    model: 'gpt-4o-mini', 
                    messages: [{ role: 'user', content: prompt }] 
                })
            });
            const data = await response.json();
            if (response.ok) {
                targetEl.innerText = data.choices[0].message.content;
            } else {
                targetEl.innerText = `Erreur API: ${data.error.message}`;
            }
        } catch (e) { 
            targetEl.innerText = "Erreur de connexion à l'IA."; 
        }
    }

    // Enregistrer la clé API
    document.getElementById('btnSaveApiKey').addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        localStorage.setItem('openai_api_key', key);
        alert('Clé API enregistrée localement !');
    });

    // Ajouter un ECU (Mode Master)
    document.getElementById('btnMasterAddEcu').addEventListener('click', () => {
        const num = document.getElementById('mEcuNum').value.trim();
        const family = document.getElementById('mEcuFamily').value.trim();
        const compat = document.getElementById('mEcuCompat').value.trim();

        if (!num) return;

        localECUs[num] = { family, compat };
        localStorage.setItem('ecus', JSON.stringify(localECUs));
        alert('ECU publié en mémoire locale !');
        
        document.getElementById('mEcuNum').value = '';
        document.getElementById('mEcuFamily').value = '';
        document.getElementById('mEcuCompat').value = '';
    });

    // Export PDF
    document.getElementById('btnExportPdf').addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const text = document.getElementById('dtcResult').innerText;
        doc.text(text, 10, 20);
        doc.save("Diagnostic.pdf");
    });

    // Partage / Copie
    document.getElementById('btnShareResult').addEventListener('click', () => {
        const text = document.getElementById('dtcResult').innerText;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            alert('Résultat copié dans le presse-papier !');
        }
    });
});
