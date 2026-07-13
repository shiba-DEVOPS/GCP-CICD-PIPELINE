const storageKey = "secure-web-apex_users";
const sessionKey = "secure-web-apex_current_user_id";
const messagesKey = "secure-web-apex_messages";
const attendanceKey = "secure-web-apex_attendance_log";
const backupStatusKey = "secure-web-apex_backup_active";

// Data Migration Bridge
if (localStorage.getItem("aws_rds_practical_users") && !localStorage.getItem(storageKey)) {
    localStorage.setItem(storageKey, localStorage.getItem("aws_rds_practical_users"));
}

// --- CORE UTILITIES ---
function getStoredUsers() { return JSON.parse(localStorage.getItem(storageKey) || "[]"); }
function saveUsers(users) { localStorage.setItem(storageKey, JSON.stringify(users)); }

// Role Migration Bridge
(function migrateRoles() {
    const users = getStoredUsers();
    let migrated = false;
    users.forEach(u => {
        if (u.role === 'head') {
            u.role = 'ceo';
            migrated = true;
        }
    });
    if (migrated) saveUsers(users);
})();
function getCurrentUserId() { return sessionStorage.getItem(sessionKey); }
function setCurrentUserId(userId) { sessionStorage.setItem(sessionKey, userId); }
function clearCurrentUserId() { sessionStorage.removeItem(sessionKey); }

function showNotification(message, type = 'info') {
    if (localStorage.getItem(backupStatusKey) === "true") return;
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    toast.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()" style="background:transparent; border:none; color:inherit; cursor:pointer; font-weight:bold; font-size: 1.2rem;">&times;</button>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function customAlert(message, type = 'info') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        const color = type === 'error' ? 'var(--danger)' : (type === 'success' ? 'var(--success)' : 'var(--accent)');
        overlay.innerHTML = `
            <div class="confirm-card" style="border-top: 4px solid ${color}">
                <p style="margin-bottom: 20px; font-weight: 500; color: var(--text-primary);">${message}</p>
                <button id="alertOk" style="background: ${color}; color: var(--bg-deep); width: 100%; font-weight: 700;">Acknowledge</button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('alertOk').onclick = () => { overlay.remove(); resolve(); };
    });
}

function customConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-card" style="border-top: 4px solid var(--accent)">
                <p style="margin-bottom: 20px; font-weight: 500; color: var(--text-primary);">${message}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="confirmYes" style="background: var(--accent); color: var(--bg-deep); flex: 1; font-weight: 700;">Confirm</button>
                    <button id="confirmNo" class="ghost-button" style="flex: 1;">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('confirmYes').onclick = () => { overlay.remove(); resolve(true); };
        document.getElementById('confirmNo').onclick = () => { overlay.remove(); resolve(false); };
    });
}

// --- BIOMETRICS ---
function getFaceDescriptor(canvas) {
    const ctx = canvas.getContext('2d');
    const width = 10, height = 10;
    const descriptor = [];
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width; tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, width, height);
    const imageData = tempCtx.getImageData(0, 0, width, height).data;
    for (let i = 0; i < imageData.length; i += 4) {
        const avg = (imageData[i] + imageData[i+1] + imageData[i+2]) / 3;
        descriptor.push(Math.round(avg));
    }
    return JSON.stringify(descriptor);
}

function compareFaces(desc1, desc2) {
    if (!desc1 || !desc2) return false;
    const d1 = JSON.parse(desc1), d2 = JSON.parse(desc2);
    let totalDiff = 0;
    for (let i = 0; i < d1.length; i++) totalDiff += Math.abs(d1[i] - d2[i]);
    return (totalDiff / d1.length) < 35;
}

async function startCamera(videoElement) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" }
        });
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => videoElement.play();
        return stream;
    } catch (err) { showNotification("Camera synchronization failed.", "error"); return null; }
}

// --- GLOBAL AUTH HANDLER ---
window.handleTierAuth = function(user, callback = null) {
    const modal = document.getElementById('faceAuthModal');
    if (!modal) return;

    modal.classList.remove('hidden');
    const tabFace = document.getElementById('tabFace'), tabPin = document.getElementById('tabPin');
    const facePanel = document.getElementById('facePanel'), pinPanel = document.getElementById('pinPanel');
    const startCamBtn = document.getElementById('startFaceCameraButton'), captureBtn = document.getElementById('captureFaceButton');
    const verifyPinBtn = document.getElementById('verifyPinButton'), loginPinInput = document.getElementById('loginPin');

    let stream;
    const stop = () => { if (stream) stream.getTracks().forEach(t => t.stop()); modal.classList.add('hidden'); };

    modal.querySelectorAll('[data-action="close-modal"]').forEach(b => b.onclick = stop);

    tabFace.onclick = () => {
        tabFace.style.background = 'var(--accent)'; tabFace.style.color = 'var(--bg-deep)';
        tabPin.style.background = 'transparent'; tabPin.style.color = 'var(--text-secondary)';
        facePanel.classList.remove('hidden'); pinPanel.classList.add('hidden');
    };

    tabPin.onclick = () => {
        tabPin.style.background = 'var(--accent)'; tabPin.style.color = 'var(--bg-deep)';
        tabFace.style.background = 'transparent'; tabFace.style.color = 'var(--text-secondary)';
        pinPanel.classList.remove('hidden'); facePanel.classList.add('hidden');
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    };

    startCamBtn.onclick = async () => { stream = await startCamera(document.getElementById('faceVideo')); };

    captureBtn.onclick = async () => {
        const video = document.getElementById('faceVideo'), canvas = document.getElementById('faceCanvas');
        if (!video || !canvas) return;
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        if (compareFaces(user.face_data, getFaceDescriptor(canvas))) {
            stop();
            if (callback) callback();
            else { setCurrentUserId(user.id); window.location.href = 'dashboard.html'; }
        } else showNotification("Biometric mismatch.", "error");
    };

    verifyPinBtn.onclick = () => {
        if (loginPinInput.value === user.securityPin) {
            stop();
            if (callback) callback();
            else { setCurrentUserId(user.id); window.location.href = 'dashboard.html'; }
        } else showNotification("Invalid PIN attempt recorded.", "error");
    };
};

function handleEnrollment(newUser) {
    const modal = document.getElementById('faceAuthModal');
    modal.classList.remove('hidden');
    const tabs = document.getElementById('securityTabs');
    if (tabs) tabs.classList.add('hidden');
    const video = document.getElementById('faceVideo');
    let stream;
    const stop = () => { if (stream) stream.getTracks().forEach(t => t.stop()); modal.classList.add('hidden'); };
    document.getElementById('startFaceCameraButton').onclick = async () => { stream = await startCamera(video); };
    document.getElementById('captureFaceButton').onclick = async () => {
        const canvas = document.getElementById('faceCanvas');
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        newUser.face_data = getFaceDescriptor(canvas);
        const users = getStoredUsers(); users.push(newUser); saveUsers(users);
        stop(); await customAlert("Security Enrollment Complete: Face & PIN recorded.", "success");
        location.reload();
    };
}

// --- ENTRY PAGE ---
function updateSignupDepartments(role) {
    const deptSelect = document.getElementById('signupDept');
    const deptContainer = document.getElementById('signupDeptContainer');
    if (!deptSelect || !deptContainer) return;

    if (role === 'ceo') {
        deptContainer.style.display = 'none';
        deptSelect.value = 'EXECUTIVE';
        return;
    } else {
        deptContainer.style.display = 'block';
    }

    const roleDepartments = {
        'employee': ['IT', 'SALES', 'MARKETING'],
        'manager': ['IT Manager', 'Marketing Head', 'Sales Manager'],
        'hr': ['HR Department'],
        'default': ['IT', 'HR', 'SALES', 'SOFTWARE DEVELOPMENT', 'SOFTWARE TESTING', 'MARKETING', 'EXECUTIVE']
    };

    const allowed = roleDepartments[role] || roleDepartments['default'];

    const allOptions = [
        { value: 'IT', label: 'IT' },
        { value: 'HR', label: 'HR' },
        { value: 'SALES', label: 'SALES' },
        { value: 'SOFTWARE DEVELOPMENT', label: 'SOFTWARE DEVELOPMENT' },
        { value: 'SOFTWARE TESTING', label: 'SOFTWARE TESTING' },
        { value: 'MARKETING', label: 'MARKETING' },
        { value: 'EXECUTIVE', label: 'EXECUTIVE BOARD' },
        { value: 'IT Manager', label: 'IT Manager' },
        { value: 'Marketing Head', label: 'Marketing Head' },
        { value: 'Sales Manager', label: 'Sales Manager' },
        { value: 'HR Department', label: 'HR Department' }
    ];

    const currentValue = deptSelect.value;
    deptSelect.innerHTML = '<option value="">Choose Department</option>';
    allOptions.forEach(opt => {
        if (allowed.includes(opt.value)) {
            const el = document.createElement('option');
            el.value = opt.value;
            el.textContent = opt.label;
            deptSelect.appendChild(el);
        }
    });

    // Restore value if it's still allowed, otherwise reset
    if (allowed.includes(currentValue)) {
        deptSelect.value = currentValue;
    }
}

function initEntryPage() {
    const loginForm = document.getElementById('loginForm'), signupForm = document.getElementById('signupForm');
    const showSignup = document.getElementById('showSignup'), showLogin = document.getElementById('showLogin');
    const signupRole = document.getElementById('signupRole');
    const loginRole = document.getElementById('loginRole');
    const universalResetBtn = document.getElementById('universalResetBtn');

    if (!loginForm) return;

    if (loginRole && universalResetBtn) {
        universalResetBtn.onclick = () => {
            const email = document.getElementById('loginEmail').value;
            const role = loginRole.value;
            if (!email) return showNotification("Please enter your email first.", "error");

            const user = getStoredUsers().find(u => u.email === email && u.role === role);
            if (!user) return showNotification(`Account not found for ${role.toUpperCase()} with this email.`, "error");

            window.handleTierAuth(user, () => {
                document.getElementById('passwordResetModal').classList.remove('hidden');
            });
        };

        document.getElementById('submitNewPassword').onclick = async () => {
            const newPass = document.getElementById('newResetPassword').value;
            if (!newPass) return showNotification("Password cannot be empty.", "error");

            const email = document.getElementById('loginEmail').value;
            const role = loginRole.value;
            const users = getStoredUsers();
            const idx = users.findIndex(u => u.email === email && u.role === role);

            if (idx !== -1) {
                users[idx].password = newPass;
                saveUsers(users);
                document.getElementById('passwordResetModal').classList.add('hidden');
                document.getElementById('newResetPassword').value = '';
                await customAlert("Your password set successful.", "success");
            }
        };
    }

    if (signupRole) {
        signupRole.addEventListener('change', (e) => updateSignupDepartments(e.target.value));
        // Initialize departments based on default role
        updateSignupDepartments(signupRole.value);
    }

    showSignup.onclick = (e) => { e.preventDefault(); loginForm.classList.add('hidden'); signupForm.classList.remove('hidden'); };
    showLogin.onclick = (e) => { e.preventDefault(); signupForm.classList.add('hidden'); loginForm.classList.remove('hidden'); };

    signupForm.onsubmit = async (e) => {
        e.preventDefault();
        const users = getStoredUsers();
        const email = document.getElementById('signupEmail').value;
        if (users.find(u => u.email === email)) return showNotification("Identity exists.", "error");

        const newUser = {
            id: Date.now(),
            role: document.getElementById('signupRole').value,
            department: document.getElementById('signupDept').value,
            name: `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`.trim(),
            email, password: document.getElementById('signupPassword').value,
            securityPin: document.getElementById('signupPin').value,
            face_data: null, jobTitle: "", nationality: "", salary: "", age: "", bloodGroup: "", mobileNumber: ""
        };

        if (['manager', 'hr', 'ceo'].includes(newUser.role)) handleEnrollment(newUser);
        else {
            users.push(newUser); saveUsers(users);
            await customAlert("Registration successful.", "success");
            showLogin.click();
        }
    };

    loginForm.onsubmit = (e) => {
        e.preventDefault();
        const role = document.getElementById('loginRole').value;
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const user = getStoredUsers().find(u => u.email === email && u.password === password && u.role === role);

        if (!user) return showNotification("Credential verification failed.", "error");
        if (role === 'employee') { setCurrentUserId(user.id); window.location.href = 'dashboard.html'; }
        else window.handleTierAuth(user);
    };
}

// --- DASHBOARD CORE ---
function initDashboard() {
    const user = getStoredUsers().find(u => u.id == getCurrentUserId());
    if (!user) return window.location.href = 'index.html';

    if (localStorage.getItem(backupStatusKey) === "true" && user.role !== 'ceo') {
        document.body.innerHTML = `<div style="height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#0a0a0b;color:#fff;text-align:center;"><h1 style="color:#38bdf8;">SYSTEM MAINTENANCE</h1><p>Backup in progress. Access restricted.</p></div>`;
        return;
    }

    const titles = { 'ceo': 'Executive HQ', 'manager': 'Admin Control', 'hr': 'HR Executive', 'employee': 'Corporate Portal' };
    document.title = titles[user.role] || 'Corporate Portal';
    window.history.replaceState({}, '', new URL(window.location));

    renderDashboard(user);
    setupEmailSystem(user);
    setupAttendanceSystem(user);
}

function renderDashboard(user) {
    document.getElementById('portalTitle').textContent = user.role === 'ceo' ? 'Executive Command Center' : 'Corporate Portal';
    document.getElementById('currentUserBadge').textContent = `${user.name} | ${user.role.toUpperCase()}`;

    const summary = document.getElementById('currentUserSummary');
    if (summary) {
        summary.innerHTML = `
            <p>ID: <strong>${user.id}</strong></p>
            <p>Name: <strong>${user.name}</strong></p>
            <p>Email: <strong>${user.email}</strong></p>
            <p>Dept: <strong>${user.department}</strong></p>
            <p>Role: <strong>${user.role.toUpperCase()}</strong></p>
            <p>Status: <strong style="color:var(--success)">AUTHORIZED</strong></p>
        `;
    }

    const detailsForm = document.getElementById('selfDetailsForm');
    const jobTitleSelect = document.getElementById('selfJobTitle');

    if (detailsForm && jobTitleSelect) {
        // Dynamic Designation Population
        const employeeDesignations = [
            "System & Network Engineer",
            "Software Developer",
            "QA Engineer",
            "Business Analyst",
            "Cloud Engineer",
            "DevOps Engineer",
            "Sales Representative",
            "Data Analyst",
            "Marketing Specialist",
            "Sales Man"
        ];

        const managementDesignations = [
            "Project Manager",
            "HR Manager",
            "Sales Manager",
            "Marketing Manager",
            "Senior Software Developer"
        ];

        const managerDesignations = [
            "Project Manager",
            "Department Manager"
        ];

        const hrDesignations = [
            "HR Manager",
            "HR Executive"
        ];

        const ceoDesignations = [
            "Head Of All Department"
        ];

        let designations = [];
        if (user.role === 'employee') designations = employeeDesignations;
        else if (user.role === 'manager') designations = managerDesignations;
        else if (user.role === 'hr') designations = hrDesignations;
        else if (user.role === 'ceo') designations = ceoDesignations;
        else designations = managementDesignations;

        jobTitleSelect.innerHTML = '<option value="">Select Designation</option>';
        designations.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            jobTitleSelect.appendChild(opt);
        });

        jobTitleSelect.value = user.jobTitle || '';
        document.getElementById('selfNationality').value = user.nationality || '';
        document.getElementById('selfSalary').value = user.salary || '';
        document.getElementById('selfAge').value = user.age || '';
        document.getElementById('selfBloodGroup').value = user.bloodGroup || '';
        document.getElementById('selfMobileNumber').value = user.mobileNumber || '';

        detailsForm.onsubmit = (e) => {
            e.preventDefault();
            const users = getStoredUsers();
            const idx = users.findIndex(u => u.id == user.id);
            if (idx !== -1) {
                users[idx].jobTitle = jobTitleSelect.value;
                users[idx].nationality = document.getElementById('selfNationality').value;
                users[idx].salary = document.getElementById('selfSalary').value;
                users[idx].age = document.getElementById('selfAge').value;
                users[idx].bloodGroup = document.getElementById('selfBloodGroup').value;
                users[idx].mobileNumber = document.getElementById('selfMobileNumber').value;
                saveUsers(users);
                showNotification("Records synchronized across all sectors.", "success");
                renderDashboard(users[idx]);
            }
        };
    }

    const directory = document.getElementById('directorySection');
    if (directory) {
        if (user.role === 'employee') {
            directory.classList.add('hidden');
        } else {
            directory.classList.remove('hidden');
            renderDirectory(user);
        }
    }

    if (user.role !== 'employee') document.getElementById('attendanceSection').classList.remove('hidden');
    renderAttendanceReports(user);

    const mZone = document.getElementById('maintenanceZone');
    if (mZone) {
        if (user.role === 'ceo') mZone.classList.remove('hidden');
        else mZone.classList.add('hidden');
    }
}

function renderDirectory(currentUser) {
    const list = getStoredUsers();
    const tableBody = document.getElementById('employeeTableBody');
    let filtered = [];

    if (currentUser.role === 'manager') {
        filtered = list.filter(u => u.department === currentUser.department && u.role === 'employee');
    } else if (currentUser.role === 'hr') {
        filtered = list.filter(u => ['manager', 'employee'].includes(u.role) && u.id != currentUser.id);
    } else if (currentUser.role === 'ceo') {
        filtered = list.filter(u => u.id != currentUser.id);
    }

    if (tableBody) {
        tableBody.innerHTML = filtered.map(u => {
            const canEdit = ['ceo', 'hr'].includes(currentUser.role);
            return `<tr>
                <td>${u.id}</td><td>${u.name}</td><td>${u.email}</td><td>${u.jobTitle || 'N/A'}</td><td>${u.nationality || 'N/A'}</td>
                <td><span class="role-badge">${u.role.toUpperCase()}</span></td>
                <td>
                    ${canEdit ? `<button class="ghost-button" style="padding:2px 8px; font-size:0.75rem;" onclick="openAdminEdit('${u.id}')">Edit</button>` : ''}
                    ${canEdit ? `<button class="danger-button" style="padding:2px 8px; font-size:0.75rem;" onclick="adminDeleteUser('${u.id}')">Delete</button>` : ''}
                    ${currentUser.role === 'ceo' ? `<button class="ghost-button" style="padding:2px 8px; font-size:0.75rem; color:var(--accent);" onclick="adminResetPassword('${u.id}')">Reset</button>` : ''}
                </td>
            </tr>`;
        }).join('') || '<tr><td colspan="7" class="empty-state">No authorized records available.</td></tr>';
    }
}

// --- ADMIN ACTIONS ---
window.openAdminEdit = (id) => {
    const user = getStoredUsers().find(u => u.id == id);
    if (!user) return;

    const editForm = document.getElementById('adminEditForm');
    const jobTitleSelect = document.getElementById('editDesignation');

    if (editForm && jobTitleSelect) {
        const employeeDesignations = [
            "System & Network Engineer",
            "Software Developer",
            "QA Engineer",
            "Business Analyst",
            "Cloud Engineer",
            "DevOps Engineer",
            "Sales Representative",
            "Data Analyst",
            "Marketing Specialist",
            "Sales Man"
        ];

        const managementDesignations = [
            "Project Manager",
            "HR Manager",
            "Sales Manager",
            "Marketing Manager",
            "Senior Software Developer"
        ];

        const managerDesignations = [
            "Project Manager",
            "Department Manager"
        ];

        const hrDesignations = [
            "HR Manager",
            "HR Executive"
        ];

        const ceoDesignations = [
            "Head Of All Department"
        ];

        let designations = [];
        if (user.role === 'employee') designations = employeeDesignations;
        else if (user.role === 'manager') designations = managerDesignations;
        else if (user.role === 'hr') designations = hrDesignations;
        else if (user.role === 'ceo') designations = ceoDesignations;
        else designations = managementDesignations;

        jobTitleSelect.innerHTML = '<option value="">Select Designation</option>';
        designations.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            jobTitleSelect.appendChild(opt);
        });

        document.getElementById('editUserId').value = user.id;
        document.getElementById('editName').value = user.name;
        document.getElementById('editEmail').value = user.email;
        jobTitleSelect.value = user.jobTitle || '';
        document.getElementById('editRegion').value = user.nationality || '';
        document.getElementById('adminEditOverlay').classList.remove('hidden');
    }
};

document.querySelector('[data-action="close-admin"]')?.addEventListener('click', () => { document.getElementById('adminEditOverlay').classList.add('hidden'); });

document.getElementById('adminEditForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('editUserId').value;
    const users = getStoredUsers();
    const idx = users.findIndex(u => u.id == id);
    if (idx !== -1) {
        users[idx].name = document.getElementById('editName').value;
        users[idx].email = document.getElementById('editEmail').value;
        users[idx].jobTitle = document.getElementById('editDesignation').value;
        users[idx].nationality = document.getElementById('editRegion').value;
        saveUsers(users);
        document.getElementById('adminEditOverlay').classList.add('hidden');
        showNotification("Record correction applied immediately.", "success");
        initDashboard();
    }
});

window.adminDeleteUser = async (id) => {
    if (await customConfirm("Permanently remove this associate record from all sectors?")) {
        saveUsers(getStoredUsers().filter(u => u.id != id));
        showNotification("Record purged.", "info");
        initDashboard();
    }
};

window.adminResetPassword = async (id) => {
    const users = getStoredUsers();
    const u = users.find(u => u.id == id);
    if (!u) return;
    if (await customConfirm(`Force credential reset for ${u.name}? Default: 'welcome123'.`)) {
        u.password = 'welcome123';
        saveUsers(users);
        showNotification(`Password reset successful for ${u.name}`, "info");
    }
};

// --- ATTENDANCE SYSTEM ---
let currentCalDate = new Date();
let selectedDateStr = "";

function setupAttendanceSystem(user) {
    const trigger = document.getElementById('attendanceTrigger'), overlay = document.getElementById('attendanceOverlay'), close = document.getElementById('closeAttendance');
    const grid = document.getElementById('calendarGrid'), panel = document.getElementById('dayActionPanel');
    if (!trigger) return;
    trigger.onclick = () => { overlay.classList.remove('hidden'); renderCalendar(); };
    close.onclick = () => { overlay.classList.add('hidden'); if(panel) panel.classList.add('hidden'); };
    document.getElementById('prevMonth').onclick = () => { currentCalDate.setMonth(currentCalDate.getMonth() - 1); renderCalendar(); };
    document.getElementById('nextMonth').onclick = () => { currentCalDate.setMonth(currentCalDate.getMonth() + 1); renderCalendar(); };
    document.getElementById('markPresent').onclick = () => recordAttendance(user, 'PRESENT');
    document.getElementById('markLeave').onclick = () => { document.getElementById('leaveReasonPanel').classList.remove('hidden'); };

    function renderCalendar() {
        if (!grid) return; grid.innerHTML = '';
        const year = currentCalDate.getFullYear(), month = currentCalDate.getMonth();
        document.getElementById('currentMonthYear').textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentCalDate);
        const days = new Date(year, month + 1, 0).getDate(), first = new Date(year, month, 1).getDay();
        const logs = JSON.parse(localStorage.getItem(attendanceKey) || "[]").filter(l => l.userId == user.id);
        for (let i = 0; i < first; i++) grid.appendChild(document.createElement('div'));
        for (let d = 1; d <= days; d++) {
            const el = document.createElement('div'); el.className = 'calendar-day'; el.textContent = d;
            const dStr = `${year}-${month + 1}-${d}`;
            if (logs.find(l => l.date === dStr)) el.classList.add('recorded');
            if (new Date().toDateString() === new Date(year, month, d).toDateString()) el.classList.add('today');
            el.onclick = () => { selectedDateStr = dStr; document.getElementById('selectedDateTitle').textContent = `Log for ${dStr}`; if(panel) panel.classList.remove('hidden'); };
            grid.appendChild(el);
        }
    }
}

function recordAttendance(user, status, category = 'General') {
    const logs = JSON.parse(localStorage.getItem(attendanceKey) || "[]");
    logs.push({ id: Date.now(), userId: user.id, name: user.name, dept: user.department, role: user.role, date: selectedDateStr, timestamp: new Date().toLocaleTimeString(), status, category });
    localStorage.setItem(attendanceKey, JSON.stringify(logs));
    showNotification(`Log synchronized: ${status}`, "success");
    const panel = document.getElementById('dayActionPanel');
    if(panel) panel.classList.add('hidden');
    initDashboard();
}

window.finalizeLeave = async (type) => {
    const user = getStoredUsers().find(u => u.id == getCurrentUserId());
    if (type === 'Normal Paid Leave') {
        document.getElementById('attendanceOverlay').classList.add('hidden');
        document.getElementById('emailOverlay').classList.remove('hidden');
        const ceo = getStoredUsers().find(u => u.role === 'ceo');
        if (ceo) { document.getElementById('mailRecipient').value = ceo.id; document.getElementById('mailSubject').value = `Paid Leave Request: ${selectedDateStr}`; }
    } else recordAttendance(user, 'LEAVE', type);
};

function renderAttendanceReports(currentUser) {
    const container = document.getElementById('attendanceTableBody');
    const logs = JSON.parse(localStorage.getItem(attendanceKey) || "[]");
    let filtered = [];
    if (currentUser.role === 'manager') filtered = logs.filter(l => l.dept === currentUser.department);
    else if (currentUser.role === 'hr' || currentUser.role === 'ceo') filtered = logs;
    if (container) container.innerHTML = filtered.map(l => `<tr><td>${l.name}</td><td>${l.dept}</td><td>${l.date} ${l.timestamp}</td><td><span class="attendance-badge ${l.status === 'PRESENT' ? 'badge-present' : 'badge-leave'}">${l.status}</span></td><td><small>${l.category}</small></td></tr>`).join('') || '<tr><td colspan="5" class="empty-state">No logs found.</td></tr>';
}

// --- EMAIL SYSTEM ---
function setupEmailSystem(user) {
    const trigger = document.getElementById('emailTrigger'), overlay = document.getElementById('emailOverlay'), close = document.getElementById('closeEmail'), send = document.getElementById('sendMailBtn');
    const list = document.getElementById('messagesList'), recipient = document.getElementById('mailRecipient');
    const composeArea = document.getElementById('emailComposeArea'), viewArea = document.getElementById('emailViewArea'), viewContent = document.getElementById('emailViewContent');

    if (!trigger) return;
    trigger.onclick = () => { overlay.classList.remove('hidden'); renderList('inbox'); };
    close.onclick = () => overlay.classList.add('hidden');
    const renderList = (folder) => {
        const msgs = JSON.parse(localStorage.getItem(messagesKey) || "[]");
        let filtered = folder === 'inbox' ? msgs.filter(m => m.toId == user.id) : msgs.filter(m => m.fromId == user.id);
        if (composeArea) composeArea.classList.add('hidden'); if (viewArea) viewArea.classList.add('hidden');
        if (folder === 'compose') { if(composeArea) composeArea.classList.remove('hidden'); return; }
        if (list) list.innerHTML = filtered.map(m => `<div class="alert info" style="cursor:pointer; margin-bottom:5px;" onclick="viewMsg('${m.id}')"><strong>${m.subject}</strong></div>`).join('') || '<p>Empty.</p>';
    };
    window.viewMsg = (id) => {
        const m = JSON.parse(localStorage.getItem(messagesKey) || "[]").find(msg => msg.id == id);
        if(composeArea) composeArea.classList.add('hidden'); if(viewArea) viewArea.classList.remove('hidden');
        if (viewContent) viewContent.innerHTML = `<h4>${m.subject}</h4><p style="white-space:pre-wrap;">${m.body}</p>`;
    };
    document.getElementById('showInbox').onclick = () => renderList('inbox');
    document.getElementById('showSent').onclick = () => renderList('sent');
    document.getElementById('showCompose').onclick = () => renderList('compose');
    const allUsers = getStoredUsers();
    let recipients = [];
    if (user.role === 'employee') recipients = allUsers.filter(u => u.department === user.department && u.role === 'manager');
    else recipients = allUsers.filter(u => u.id != user.id);
    if (recipient) recipient.innerHTML = '<option value="">Select Recipient</option>' + recipients.map(u => `<option value="${u.id}">${u.name} [${u.role.toUpperCase()}]</option>`).join('');
    if (send) {
        send.onclick = () => {
            const body = document.getElementById('mailBody'), sub = document.getElementById('mailSubject');
            if (!recipient.value || !body.value) return showNotification("Required content missing.", "error");
            const msgs = JSON.parse(localStorage.getItem(messagesKey) || "[]");
            msgs.push({ id: Date.now(), fromId: user.id, toId: recipient.value, subject: sub.value || "General", body: body.value });
            localStorage.setItem(messagesKey, JSON.stringify(msgs));
            showNotification("Message dispatched.", "success"); body.value = ''; sub.value = ''; renderList('sent');
        };
    }
}

// --- BACKUP SYSTEM ---
function getFullSystemState() {
    return {
        timestamp: new Date().toISOString(),
        users: getStoredUsers(),
        attendance: JSON.parse(localStorage.getItem(attendanceKey) || "[]"),
        messages: JSON.parse(localStorage.getItem(messagesKey) || "[]")
    };
}

let activeHardwareHandle = null;
window.forceOpenBackup = function() {
    const user = getStoredUsers().find(u => u.id == getCurrentUserId());
    if (!user || user.role !== 'ceo') return showNotification("CEO access only.", "error");
    const modal = document.getElementById('backupModal');
    const driveList = document.getElementById('driveList');
    const driveStatus = document.getElementById('driveStatus');
    const selection = document.getElementById('backupSelection');
    const cloudPanel = document.getElementById('cloudPanel');
    const localPanel = document.getElementById('localPanel');
    const startLocalBtn = document.getElementById('startLocalBackup');
    const scanBtn = document.getElementById('checkDrive');
    modal.classList.remove('hidden');
    selection.classList.remove('hidden');
    cloudPanel.classList.add('hidden');
    localPanel.classList.add('hidden');
    startLocalBtn.classList.add('hidden');
    document.getElementById('closeBackup').onclick = () => modal.classList.add('hidden');
    document.getElementById('btnCloudBackup').onclick = () => { selection.classList.add('hidden'); cloudPanel.classList.remove('hidden'); resetCloudUI(); };
    document.getElementById('btnLocalBackup').onclick = () => { selection.classList.add('hidden'); localPanel.classList.remove('hidden'); };
    document.getElementById('backToSelection').onclick = () => { cloudPanel.classList.add('hidden'); selection.classList.remove('hidden'); };
    document.getElementById('backToSelectionLocal').onclick = () => { localPanel.classList.add('hidden'); selection.classList.remove('hidden'); };

    // Cloud Logic
    const cloudProvider = document.getElementById('cloudProvider'), cloudLink = document.getElementById('cloudLink'), startCloudBtn = document.getElementById('startCloudBackup'), scheduleCheck = document.getElementById('scheduleBackup'), timeRow = document.getElementById('scheduleTimeRow');
    const checkCloudInputs = () => { if (cloudProvider.value && cloudLink.value.trim() !== "") startCloudBtn.classList.remove('hidden'); else startCloudBtn.classList.add('hidden'); };
    if (cloudProvider) cloudProvider.onchange = checkCloudInputs;
    if (cloudLink) cloudLink.oninput = checkCloudInputs;
    function resetCloudUI() { cloudProvider.value = ''; cloudLink.value = ''; scheduleCheck.checked = false; timeRow.classList.add('hidden'); startCloudBtn.classList.add('hidden'); }
    if (scheduleCheck) scheduleCheck.onchange = () => { if (scheduleCheck.checked) timeRow.classList.remove('hidden'); else timeRow.classList.add('hidden'); };
    if (startCloudBtn) startCloudBtn.onclick = () => { window.handleTierAuth(user, () => { modal.classList.add('hidden'); runBackupSimulation(cloudLink.value, false); }); };

    // Hardware Logic
    scanBtn.onclick = async () => {
        try {
            if (!('showDirectoryPicker' in window)) return alert("Requires Chrome/Edge.");
            driveStatus.textContent = "Querying system...";
            const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
            if (handle) {
                activeHardwareHandle = handle;
                driveList.innerHTML = `<div class="alert success"><strong>HARDWARE LINK ESTABLISHED</strong><br><small>Device: ${handle.name}</small></div>`;
                driveStatus.textContent = "Ready.";
                startLocalBtn.classList.remove('hidden');
                scanBtn.classList.add('hidden');
            }
        } catch (err) { if (err.name !== 'AbortError') showNotification("Failed.", "error"); }
    };
    startLocalBtn.onclick = function() {
        if (!activeHardwareHandle) return;
        window.handleTierAuth(user, async () => {
            try {
                const name = `backup_${new Date().toISOString().split('T')[0]}.bak`;
                const file = await activeHardwareHandle.getFileHandle(name, { create: true });
                const writer = await file.createWritable();
                await writer.write(JSON.stringify(getFullSystemState(), null, 2));
                await writer.close();
                modal.classList.add('hidden');
                runBackupSimulation(activeHardwareHandle.name, true);
            } catch (err) { showNotification("Blocked.", "error"); }
        });
    };
};

function runBackupSimulation(dest, isLocal = false) {
    const overlay = document.getElementById('backupLockoutOverlay'), bar = document.getElementById('backupProgressBar'), percentText = document.getElementById('backupPercentText'), rateText = document.getElementById('transferRateText'), successMsg = document.getElementById('backupSuccessMsg');
    localStorage.setItem(backupStatusKey, "true");
    const h2 = overlay.querySelector('h2'), p = overlay.querySelector('p');
    if (h2) h2.textContent = isLocal ? "HARDWARE TRANSFER" : "CLOUD UPLOAD";
    if (p) p.innerHTML = `Target: <strong>${dest}</strong>`;
    overlay.classList.remove('hidden'); if(successMsg) successMsg.classList.add('hidden');
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 5 + 1;
        if (progress >= 100) {
            progress = 100; clearInterval(interval);
            if (successMsg) successMsg.classList.remove('hidden');
            localStorage.setItem(backupStatusKey, "false");
            showNotification("Success.", "success");
            setTimeout(() => { overlay.classList.add('hidden'); location.reload(); }, 4000);
        }
        if (bar) bar.style.width = progress + "%";
        if (percentText) percentText.textContent = Math.floor(progress) + "% Amount Transferred";
        if (rateText) rateText.textContent = (isLocal ? 280 + Math.random() * 50 : 45).toFixed(1) + " MB/s Speed";
    }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
    initEntryPage();
    if (window.location.pathname.includes('dashboard.html')) initDashboard();
});

document.getElementById('logoutButton')?.addEventListener('click', () => { clearCurrentUserId(); window.location.href = 'index.html'; });
window.systemReset = async () => { if (await customConfirm("Purge all data?")) { localStorage.clear(); location.reload(); } };
