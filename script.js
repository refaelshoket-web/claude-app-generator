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

// עדכון אינדיקטור חיבור
function updateConnectionStatus(status, text, details = null) {
    const dot = document.getElementById('connectionStatus');
    const textEl = document.getElementById('connectionText');
    const detailsEl = document.getElementById('connectionDetails');
    
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
    if (details) {
        showConnectionDetails(details);
    } else {
        detailsEl.classList.remove('show');
    }
}

// הצגת פרטים טכניים על החיבור
function showConnectionDetails(details) {
    const detailsEl = document.getElementById('connectionDetails');
    
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
    
    status.textContent = message;
    status.className = `api-status ${type}`;
    
    if (type === 'success') {
        setup.classList.add('configured');
    } else {
        setup.classList.remove('configured');
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
    
    const instructions = document.getElementById('instructions').value.trim();
    
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
        document.getElementById('executeBtn').textContent = 'מעבד...';
        document.getElementById('executeBtn').disabled = true;
        
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
        document.getElementById('executeBtn').textContent = 'צור אפליקציה';
        document.getElementById('executeBtn').disabled = false;
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
        previewFrame.src = url;
        
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
