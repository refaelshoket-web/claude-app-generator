// משתני מערכת גלובליים
let apiKey = '';
let saveFolder = null;
let currentVersion = null;
let loadedProject = null;
let selectedWorkMode = null;
let isProcessing = false;
let consoleVisible = false;

// מערכת למידה וסטטיסטיקות
let learningData = {
    projects: [],
    modules: [],
    errors: [],
    userPreferences: {
        colors: [],
        styles: [],
        patterns: []
    },
    stats: {
        projectCount: 0,
        moduleCount: 0,
        errorCount: 0
    }
};

// הוספת הודעה לקונסול
function logToConsole(type, message) {
    const consoleContent = document.getElementById('consoleContent');
    if (!consoleContent) return;
    
    const timestamp = new Date().toLocaleTimeString('he-IL');
    
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.innerHTML = `
        <span class="console-time">[${timestamp}]</span>
        <span class="console-message">${message}</span>
    `;
    
    consoleContent.appendChild(line);
    consoleContent.scrollTop = consoleContent.scrollHeight;
}

// הוספת הודעת צ'אט
function addChatMessage(type, message) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    messageDiv.textContent = message;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // הגבלה למקסימום 10 הודעות
    const messages = chatMessages.querySelectorAll('.chat-message');
    if (messages.length > 10) {
        messages[0].remove();
    }
}

// עדכון אינדיקטור חיבור
function updateConnectionStatus(status, text, details = null) {
    const dot = document.getElementById('connectionStatus');
    const textEl = document.getElementById('connectionText');
    const detailsEl = document.getElementById('connectionDetails');
    
    if (!dot || !textEl) return;
    
    // ניקוי מחלקות קיימות
    dot.className = 'status-dot';
    
    // עדכון סטטוס
    switch (status) {
        case 'disconnected':
            dot.classList.add('disconnected');
            textEl.textContent = text || 'לא מחובר';
            textEl.style.color = '#718096';
            break;
        case 'connecting':
            dot.classList.add('connecting');
            textEl.textContent = text || 'מתחבר...';
            textEl.style.color = '#ed8936';
            break;
        case 'connected':
            dot.classList.add('connected');
            textEl.textContent = text || 'מחובר ✓';
            textEl.style.color = '#38a169';
            break;
        case 'error':
            dot.classList.add('error');
            textEl.textContent = text || 'שגיאת חיבור';
            textEl.style.color = '#e53e3e';
            break;
    }
    
    // הצגת פרטים טכניים
    if (details && detailsEl) {
        showConnectionDetails(details);
    } else if (detailsEl) {
        detailsEl.classList.remove('show');
    }
}

// הצגת פרטים טכניים על החיבור
function showConnectionDetails(details) {
    const detailsEl = document.getElementById('connectionDetails');
    if (!detailsEl) return;
    
    let html = '<strong>פרטי חיבור:</strong><br>';
    
    details.forEach(detail => {
        const className = detail.type || 'info';
        html += `<div class="detail-line ${className}">• ${detail.message}</div>`;
    });
    
    detailsEl.innerHTML = html;
    detailsEl.classList.add('show');
}

// הגדרת API Key
function setupAPI() {
    const input = document.getElementById('apiKey');
    if (!input) return;
    
    const key = input.value.trim();
    
    if (!key) {
        updateApiStatus('error', 'אנא הכנס מפתח API תקף');
        updateConnectionStatus('error', 'אין מפתח');
        return;
    }
    
    if (!key.startsWith('sk-ant-')) {
        updateApiStatus('error', 'מפתח API חייב להתחיל ב-sk-ant-');
        updateConnectionStatus('error', 'מפתח לא תקף');
        return;
    }
    
    apiKey = key;
    localStorage.setItem('apiKey', key);
    updateApiStatus('success', 'מפתח API נשמר בהצלחה');
    updateConnectionStatus('disconnected', 'מפתח שמור - לחץ "בדוק חיבור"');
    
    logToConsole('success', 'מפתח API הוגדר וזמין לשימוש');
    addChatMessage('system', 'מעולה! המפתח נשמר. עכשיו לחץ "בדוק חיבור" לוודא שהכל עובד');
}

// עדכון סטטוס API
function updateApiStatus(type, message) {
    const status = document.getElementById('apiStatus');
    const setup = document.getElementById('apiSetup');
    
    if (status) {
        status.textContent = message;
        status.className = `api-status ${type}`;
    }
    
    if (setup) {
        if (type === 'success') {
            setup.classList.add('configured');
        } else {
            setup.classList.remove('configured');
        }
    }
}

// בדיקת חיבור דרך Vercel Function
async function testConnection() {
    if (!apiKey) {
        updateConnectionStatus('error', 'אין מפתח API');
        addChatMessage('error', 'אנא הגדר מפתח API קודם');
        return;
    }
    
    updateConnectionStatus('connecting', 'בודק חיבור...');
    addChatMessage('system', 'בודק חיבור דרך Vercel Function...');
    logToConsole('info', 'מתחיל בדיקת חיבור דרך Vercel Function');
    
    const details = [];
    
    try {
        details.push({
            type: 'info',
            message: `מפתח מתחיל ב-${apiKey.substring(0, 10)}...`
        });
        
        details.push({
            type: 'info', 
            message: 'בודק זמינות Vercel Function...'
        });
        
        const startTime = Date.now();
        
        const response = await fetch('/api/claude-api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                apiKey: apiKey,
                prompt: 'Test connection - מבדיק חיבור'
            })
        });
        
        const responseTime = Date.now() - startTime;
        
        details.push({
            type: 'info',
            message: `זמן תגובה: ${responseTime}ms`
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success) {
                details.push({
                    type: 'success',
                    message: 'חיבור דרך Vercel Function מוצלח!'
                });
                
                details.push({
                    type: 'success', 
                    message: 'Claude API מגיב תקין'
                });
                
                updateConnectionStatus('connected', 'מחובר בהצלחה!', details);
                addChatMessage('success', 'חיבור ל-Claude API עובד מעולה דרך Vercel! המערכת מוכנה לשימוש');
                logToConsole('success', `API connection test passed via Vercel Function (${responseTime}ms)`);
                
            } else {
                details.push({
                    type: 'error',
                    message: `שגיאת API: ${data.error}`
                });
                
                updateConnectionStatus('error', 'שגיאת API', details);
                
                // הצעות לפי סוג השגיאה
                if (data.error.includes('unauthorized') || data.error.includes('invalid')) {
                    addChatMessage('error', 'מפתח ה-API לא תקף או פג תוקף');
                    addChatMessage('system', 'פתרון: בדוק את המפתח באתר console.anthropic.com');
                } else if (data.error.includes('rate limit') || data.error.includes('quota')) {
                    addChatMessage('error', 'הגעת לגבול השימוש');
                    addChatMessage('system', 'פתרון: המתן מעט או בדוק גבולות באתר Anthropic');
                } else {
                    addChatMessage('error', `שגיאה: ${data.error}`);
                }
            }
        } else {
            // שגיאה ברמת ה-Function
            if (response.status === 404) {
                details.push({
                    type: 'error',
                    message: 'Vercel Function לא נמצאה - Function לא פעילה'
                });
                
                updateConnectionStatus('error', 'Function חסרה', details);
                addChatMessage('error', 'Vercel Function לא פעילה');
                addChatMessage('system', 'בדוק שהקובץ api/claude-api.js קיים ב-Vercel');
            } else {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
                details.push({
                    type: 'error',
                    message: `שגיאת שרת: ${errorData.error}`
                });
                
                updateConnectionStatus('error', 'שגיאת שרת', details);
                addChatMessage('error', `שגיאת שרת: ${errorData.error}`);
            }
        }
        
    } catch (error) {
        details.push({
            type: 'error',
            message: `שגיאה כללית: ${error.message}`
        });
        
        updateConnectionStatus('error', 'שגיאה כללית', details);
        logToConsole('error', `Connection test failed: ${error.message}`);
        
        if (error.message.includes('Failed to fetch')) {
            addChatMessage('error', 'לא ניתן להגיע ל-Vercel Function');
            addChatMessage('system', 'בדוק שהאתר פעיל ושה-Function נטענה כמו שצריך');
        } else {
            addChatMessage('error', `שגיאה: ${error.message}`);
        }
    }
}

// קריאה ל-Claude API דרך Vercel Function
async function callClaudeAPI(prompt) {
    logToConsole('info', 'שולח בקשה דרך Vercel Function...');
    
    try {
        const response = await fetch('/api/claude-api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                apiKey: apiKey,
                prompt: prompt
            })
        });
        
        logToConsole('info', 'בקשה נשלחה, מחכה לתגובה מהשרת...');
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'שגיאה לא ידועה מהשרת');
        }
        
        logToConsole('success', 'תגובה התקבלה מ-Claude API דרך השרת!');
        
        return {
            success: true,
            content: data.content
        };
        
    } catch (error) {
        logToConsole('error', 'שגיאה בקריאה ל-API: ' + error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// ביצוע הוראות - הפונקציה הראשית של המחולל
async function executeInstructions() {
    if (!apiKey) {
        addChatMessage('error', 'אנא הגדר מפתח API תחילה');
        return;
    }
    
    const instructionsEl = document.getElementById('instructions');
    if (!instructionsEl) {
        addChatMessage('error', 'שגיאה: לא נמצא שדה ההוראות');
        return;
    }
    
    const instructions = instructionsEl.value.trim();
    
    if (!instructions) {
        addChatMessage('error', 'אנא כתב הוראות למחולל');
        return;
    }
    
    if (isProcessing) {
        addChatMessage('warning', 'המחולל עדיין עובד על הבקשה הקודמת...');
        return;
    }
    
    isProcessing = true;
    
    try {
        // עדכון UI
        const executeBtn = document.getElementById('executeBtn');
        if (executeBtn) {
            executeBtn.textContent = 'מעבד...';
            executeBtn.disabled = true;
        }
        
        updateConnectionStatus('connecting', 'מייצר אפליקציה...');
        addChatMessage('system', 'מתחיל ליצור אפליקציה לפי ההוראות שלך...');
        logToConsole('info', 'מתחיל יצירת אפליקציה: ' + instructions);
        
        // יצירת prompt מתקדם למחולל
        const prompt = `
אנא צור אפליקצית HTML מלאה לפי ההוראות הבאות:

${instructions}

דרישות טכניות:
1. צור קובץ HTML מלא עם CSS ו-JavaScript מוטמעים
2. השתמש בעיצוב מודרני ונקי
3. הוסף אנימציות ואפקטים חזותיים מתאימים
4. ודא שהאפליקציה פונקציונלית לחלוטין
5. הוסף הגיבות בעברית בקוד
6. השתמש בצבעים יפים ובעיצוב מקצועי
7. הקוד צריך להיות מלא וזמין להרצה מיד

אנא החזר רק את הקוד עצמו, ללא הסברים נוספים.
        `;
        
        // קריאה ל-Claude API
        const result = await callClaudeAPI(prompt);
        
        if (result.success) {
            // עיבוד התוצאה
            let htmlCode = result.content;
            
            // ניקוי הקוד מטקסט מיותר
            htmlCode = htmlCode.replace(/```html/gi, '').replace(/```/gi, '').trim();
            
            // יצירת קובץ והצגה בתצוגה מקדימה
            displayGeneratedCode(htmlCode, instructions);
            
            // עדכון סטטיסטיקות
            learningData.stats.projectCount++;
            learningData.projects.push({
                instructions: instructions,
                timestamp: new Date().toISOString(),
                success: true
            });
            saveData();
            updateStats();
            
            updateConnectionStatus('connected', 'אפליקציה נוצרה בהצלחה!');
            addChatMessage('success', 'האפליקציה נוצרה בהצלחה! אתה יכול לראות אותה בתצוגה המקדימה');
            logToConsole('success', 'אפליקציה נוצרה בהצלחה');
            
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        // טיפול בשגיאות
        learningData.stats.errorCount++;
        learningData.errors.push({
            error: error.message,
            instructions: instructions,
            timestamp: new Date().toISOString()
        });
        saveData();
        updateStats();
        
        updateConnectionStatus('error', 'שגיאה ביצירת האפליקציה');
        addChatMessage('error', 'שגיאה ביצירת האפליקציה: ' + error.message);
        logToConsole('error', 'שגיאה ביצירה: ' + error.message);
    } finally {
        // איפוס UI
        isProcessing = false;
        const executeBtn = document.getElementById('executeBtn');
        if (executeBtn) {
            executeBtn.textContent = 'צור אפליקציה';
            executeBtn.disabled = false;
        }
    }
}

// הצגת הקוד שנוצר
function displayGeneratedCode(htmlCode, instructions) {
    try {
        // יצירת Blob עם הקוד
        const blob = new Blob([htmlCode], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        // הצגה בתצוגה המקדימה
        const previewFrame = document.getElementById('previewFrame');
        if (previewFrame) {
            previewFrame.src = url;
        }
        
        // שמירת הקוד למשתנה גלובלי
        currentVersion = {
            code: htmlCode,
            instructions: instructions,
            timestamp: new Date().toISOString(),
            url: url
        };
        
        // הצגת כפתורי פעולה
        showActionButtons();
        
        logToConsole('success', 'קוד HTML נוצר והוצג בתצוגה המקדימה');
        
    } catch (error) {
        logToConsole('error', 'שגיאה בהצגת הקוד: ' + error.message);
        addChatMessage('error', 'שגיאה בהצגת התוצאה');
    }
}

// הצגת כפתורי פעולה
function showActionButtons() {
    const previewActions = document.getElementById('previewActions');
    if (previewActions) {
        previewActions.style.display = 'flex';
    }
}

// שמירת הקוד כקובץ
async function saveCurrentProject() {
    if (!currentVersion) {
        addChatMessage('error', 'אין פרויקט לשמירה');
        return;
    }
    
    try {
        let filename = 'app-' + Date.now() + '.html';
        
        if (saveFolder) {
            // שמירה לתיקייה שנבחרה
            const fileHandle = await saveFolder.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(currentVersion.code);
            await writable.close();
            
            addChatMessage('success', `הפרויקט נשמר בהצלחה: ${filename}`);
            logToConsole('success', `פרויקט נשמר בתיקייה: ${filename}`);
        } else {
            // הורדה רגילה
            const blob = new Blob([currentVersion.code], { type: 'text/html; charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            
            addChatMessage('success', `הפרויקט הורד בהצלחה: ${filename}`);
            logToConsole('success', `פרויקט הורד: ${filename}`);
        }
        
    } catch (error) {
        addChatMessage('error', 'שגיאה בשמירת הפרויקט: ' + error.message);
        logToConsole('error', 'שגיאה בשמירה: ' + error.message);
    }
}

// טעינת נתונים משמורים
function loadSavedData() {
    try {
        const savedApiKey = localStorage.getItem('apiKey');
        const savedLearningData = localStorage.getItem('learningData');
        const savedVersions = localStorage.getItem('versions');
        
        if (savedApiKey) {
            apiKey = savedApiKey;
            const apiKeyEl = document.getElementById('apiKey');
            if (apiKeyEl) {
                apiKeyEl.value = savedApiKey;
            }
            updateApiStatus('success', 'מפתח API טעון מהזיכרון');
            updateConnectionStatus('disconnected', 'מפתח טעון - לחץ "בדוק חיבור"');
        } else {
            updateConnectionStatus('disconnected', 'אין מפתח API');
        }
        
        if (savedLearningData) {
            learningData = JSON.parse(savedLearningData);
            updateStats();
        }
        
        if (savedVersions) {
            const versions = JSON.parse(savedVersions);
            displayVersions(versions);
        }
        
        logToConsole('info', 'נתונים שמורים נטענו בהצלחה');
    } catch (error) {
        logToConsole('error', 'שגיאה בטעינת נתונים שמורים: ' + error.message);
        updateConnectionStatus('error', 'שגיאה בטעינת נתונים');
    }
}

// שמירת נתונים
function saveData() {
    try {
        localStorage.setItem('learningData', JSON.stringify(learningData));
        logToConsole('success', 'נתונים נשמרו בהצלחה');
    } catch (error) {
        logToConsole('error', 'שגיאה בשמירת נתונים: ' + error.message);
    }
}

// בחירת תיקיית שמירה
async function selectSaveFolder() {
    try {
        if ('showDirectoryPicker' in window) {
            saveFolder = await window.showDirectoryPicker();
            const pathElement = document.getElementById('savePath');
            if (pathElement) {
                pathElement.textContent = saveFolder.name;
                pathElement.classList.add('active');
            }
            
            logToConsole('success', 'תיקיית שמירה נבחרה: ' + saveFolder.name);
            addChatMessage('system', 'תיקיית השמירה נבחרה בהצלחה! כל הקבצים יישמרו שם אוטומטית');
        } else {
            alert('הדפדפן שלך לא תומך בבחירת תיקיות. הקבצים יורדו לתיקיית ההורדות');
            logToConsole('warning', 'הדפדפן לא תומך ב-File System Access API');
        }
    } catch (error) {
        logToConsole('error', 'שגיאה בבחירת תיקייה: ' + error.message);
    }
}

// שמירת גרסה
function saveVersion() {
    if (!currentVersion) {
        addChatMessage('error', 'אין פרויקט לשמירת גרסה');
        return;
    }
    
    try {
        const versions = JSON.parse(localStorage.getItem('versions') || '[]');
        const versionData = {
            id: Date.now(),
            instructions: currentVersion.instructions,
            timestamp: currentVersion.timestamp,
            code: currentVersion.code
        };
        
        versions.push(versionData);
        localStorage.setItem('versions', JSON.stringify(versions));
        
        displayVersions(versions);
        addChatMessage('success', 'גרסה נשמרה בהצלחה');
        logToConsole('success', 'גרסה חדשה נשמרה');
        
    } catch (error) {
        addChatMessage('error', 'שגיאה בשמירת גרסה: ' + error.message);
        logToConsole('error', 'שגיאה בשמירת גרסה: ' + error.message);
    }
}

// הצגת גרסאות
function displayVersions(versions) {
    const versionsList = document.getElementById('versionsList');
    if (!versionsList) return;
    
    if (versions.length === 0) {
        versionsList.innerHTML = '<p style="text-align:center;color:#718096;font-size:12px;">אין גרסאות שמורות</p>';
        return;
    }
    
    versionsList.innerHTML = versions.slice(-5).reverse().map(version => `
        <div class="version-item" onclick="loadVersion(${version.id})">
            <div class="version-title">${version.instructions.substring(0, 30)}...</div>
            <div class="version-time">${new Date(version.timestamp).toLocaleString('he-IL')}</div>
        </div>
    `).join('');
}

// טעינת גרסה
function loadVersion(versionId) {
    try {
        const versions = JSON.parse(localStorage.getItem('versions') || '[]');
        const version = versions.find(v => v.id === versionId);
        
        if (version) {
            currentVersion = version;
            displayGeneratedCode(version.code, version.instructions);
            const instructionsEl = document.getElementById('instructions');
            if (instructionsEl) {
                instructionsEl.value = version.instructions;
            }
            
            addChatMessage('success', 'גרסה נטענה בהצלחה');
            logToConsole('success', 'גרסה נטענה: ' + versionId);
        }
    } catch (error) {
        addChatMessage('error', 'שגיאה בטעינת גרסה: ' + error.message);
        logToConsole('error', 'שגיאה בטעינת גרסה: ' + error.message);
    }
}

// הצגה/הסתרת קונסול
function toggleConsole() {
    const overlay = document.getElementById('consoleOverlay');
    const toggleText = document.getElementById('consoleToggleText');
    
    if (!overlay) return;
    
    consoleVisible = !consoleVisible;
    
    if (consoleVisible) {
        overlay.classList.add('active');
        if (toggleText) toggleText.textContent = 'הסתר קונסול';
    } else {
        overlay.classList.remove('active');
        if (toggleText) toggleText.textContent = 'הצג קונסול';
    }
    
    logToConsole('info', consoleVisible ? 'קונסול נפתח' : 'קונסול נסגר');
}

// ניקוי קונסול
function clearConsole() {
    const consoleContent = document.getElementById('consoleContent');
    if (!consoleContent) return;
    
    consoleContent.innerHTML = '<div class="console-line info"><span class="console-time">[נוקה]</span><span class="console-message">קונסול נוקה</span></div>';
    logToConsole('info', 'קונסול נוקה');
}

// ייצוא לוג
function exportLog() {
    const consoleContent = document.getElementById('consoleContent');
    if (!consoleContent) return;
    
    const lines = consoleContent.querySelectorAll('.console-line');
    
    let logText = 'לוג מחולל האפליקציות - ' + new Date().toLocaleString('he-IL') + '\n';
    logText += '='.repeat(50) + '\n\n';
    
    lines.forEach(line => {
        const time = line.querySelector('.console-time').textContent;
        const message = line.querySelector('.console-message').textContent;
        logText += `${time} ${message}\n`;
    });
    
    const blob = new Blob([logText], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-generator-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    logToConsole('success', 'לוג יוצא בהצלחה');
}

// רענון תצוגה מקדימה
function refreshPreview() {
    const previewFrame = document.getElementById('previewFrame');
    if (previewFrame && previewFrame.src && previewFrame.src !== 'about:blank') {
        previewFrame.src = previewFrame.src;
        logToConsole('info', 'תצוגה מקדימה רועננה');
    }
}

// מסך מלא
function fullscreen() {
    const previewFrame = document.getElementById('previewFrame');
    if (!previewFrame) return;
    
    if (previewFrame.requestFullscreen) {
        previewFrame.requestFullscreen();
    } else if (previewFrame.webkitRequestFullscreen) {
        previewFrame.webkitRequestFullscreen();
    }
}

// עדכון סטטיסטיקות
function updateStats() {
    const projectCountEl = document.getElementById('projectCount');
    const moduleCountEl = document.getElementById('moduleCount');
    const errorCountEl = document.getElementById('errorCount');
    
    if (projectCountEl) projectCountEl.textContent = learningData.stats.projectCount;
    if (moduleCountEl) moduleCountEl.textContent = learningData.stats.moduleCount;
    if (errorCountEl) errorCountEl.textContent = learningData.stats.errorCount;
}

// אתחול המערכת
document.addEventListener('DOMContentLoaded', function() {
    logToConsole('info', 'מחולל האפליקציות נטען בהצלחה');
    loadSavedData();
    
    // הוספת מאזיני אירועים
    const instructionsEl = document.getElementById('instructions');
    if (instructionsEl) {
        instructionsEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                executeInstructions();
            }
        });
    }
    
    // טיפול בשגיאות JavaScript גלובליות
    window.addEventListener('error', function(e) {
        logToConsole('error', `שגיאת JavaScript: ${e.message} בקובץ ${e.filename} שורה ${e.lineno}`);
        updateConnectionStatus('error', 'שגיאת JavaScript');
    });
    
    // טיפול בדחיית Promises
    window.addEventListener('unhandledrejection', function(e) {
        logToConsole('error', `Promise נדחה: ${e.reason}`);
        updateConnectionStatus('error', 'שגיאה בקוד');
    });
    
    addChatMessage('system', 'ברוך הבא למחולל האפליקציות החכם! הגדר מפתח API ובדוק חיבור כדי להתחיל');
    
    logToConsole('success', 'מערכת מוכנה לעבודה - אינדיקטורים פעילים');
});
