# Beyond-Gut Technical User Guide
## User IDs, Multi-Device Access & Data Storage

---

## Question 1: How Can We Set Different User IDs When Sharing This Link?

### The Site Code Mechanism

The tool uses a **Site Code (Clinic Prefix)** system to generate unique patient IDs across multiple locations sharing the same link.

#### How It Works

1. **Each clinic/location sets a unique Site Code** (prefix)
   - Example: Clinic A = "CLINA", Clinic B = "CLINB", Clinic C = "CLINIC"
   - Set via the **Site button** in the top-right corner of the application
   - Code can be 1–8 alphanumeric characters, automatically uppercase

2. **Patient IDs are auto-generated** with the Site Code prefix
   - Format: `[SITE-CODE]-[SEQUENCE]`
   - Examples:
     - Clinic A, 1st patient: `CLINA-0001`
     - Clinic A, 2nd patient: `CLINA-0002`
     - Clinic B, 1st patient: `CLINB-0001`
     - Clinic B, 2nd patient: `CLINB-0002`

3. **Default site code**: If no site code is set, all IDs default to `BMG-0001`, `BMG-0002`, etc.

#### Practical Setup for Multi-Clinic Sharing

```
Step 1: Clinic A opens the link → Click "Site: BMG" button → Enter "CLINA"
Step 2: Clinic A patients now get ID pattern: CLINA-0001, CLINA-0002, ...

Step 3: Clinic B opens the same link → Click "Site: BMG" button → Enter "CLINB"
Step 4: Clinic B patients now get ID pattern: CLINB-0001, CLINB-0002, ...

Step 5: When pooling data, CLINA-* records are easily identified as Clinic A
       and CLINB-* records are identified as Clinic B
```

#### Benefits

✅ **Prevents ID collision** — Multiple clinics can use the same link without duplicate patient IDs  
✅ **Automatic tracking** — Source clinic is embedded in every patient ID  
✅ **No central server needed** — Each location manages its own sequence independently  
✅ **One-time setup** — Set site code once per clinic/device

#### Technical Details (in code)

- **Location**: `index.html`, lines 2137–2150, 4560–4579
- **Storage key**: `db.meta.siteCode` (stored in browser localStorage)
- **ID generation**: `sitePrefix(db) + '-' + String(patientSeq).padStart(4, '0')`
- **Validation**: Only alphanumeric characters; max 8 characters; auto-uppercase

---

## Question 2: How Many Devices Can Be Logged In Simultaneously with a Single User ID?

### Important Clarification: No "User Login" Exists

The Beyond-Gut tool **does NOT have a traditional user login system** (username/password, user accounts, authentication). Instead:

- **No authentication required** — Anyone with the link can access the app
- **No user accounts** — Data is tied to Patient Records, not user profiles
- **No session management** — Data persists based on browser storage, not server sessions

### Multi-Device Behavior

#### Device-Specific Data Storage

Each device/browser maintains its **own independent local database**:

| Device | Browser | Storage | Data Access |
|--------|---------|---------|------------|
| Desktop 1 | Chrome | Chrome localStorage: `bmgutscreen_v2` | Sees only its local patients |
| Desktop 1 | Firefox | Firefox localStorage: `bmgutscreen_v2` | Separate database from Chrome |
| Laptop | Chrome | Chrome localStorage: `bmgutscreen_v2` | Separate from Desktop's Chrome |
| Tablet | Safari | Safari localStorage: `bmgutscreen_v2` | Completely isolated |
| Mobile Phone | Safari | Safari localStorage: `bmgutscreen_v2` | Completely isolated |

#### Key Point: **No Synchronization Between Devices**

If Clinician A opens the app on:
- Device 1 (Desktop, Chrome): Creates patient "CLIN-0001" for patient John Doe
- Device 2 (Laptop, Chrome): Creates **separate** patient "CLIN-0001" for patient Jane Smith
- These are two independent databases; no sync between them

### Why No Multi-Device Login?

**Design Decision (by specification)**:
- Tool is designed as **offline-first, single-browser app**
- Data stored in **browser localStorage** (device-specific, not cloud)
- No central server or authentication backend
- Intentional to preserve **privacy** (data never leaves the device)

### Implications for Multi-Clinic Use

If multiple clinicians share one device:

❌ **They will see the same patient database** (if using same browser)  
✅ **Solution**: Use different browsers (Chrome vs Firefox) or different user profiles on the OS

### If You Need Multi-Device Synchronization

**Current workaround**:
1. **Export data** from Device 1 (CSV download)
2. **Import data** on Device 2 (merge import feature)
3. **Manual sync** — Export periodically, share via email/secure file transfer

**Future enhancement** (not yet implemented):
- Cloud backend for data sync across devices
- User authentication with password
- Real-time collaboration

---

## Question 3: How Is the Patient Database and Results Stored?

### Storage Architecture

#### Where Data Is Stored

| Component | Location | Scope | Persistence |
|-----------|----------|-------|-------------|
| **Patient records** | Browser localStorage | Device + Browser-specific | Stays until explicitly deleted or browser cache cleared |
| **Visit data** | Browser localStorage | Device + Browser-specific | Stays until explicitly deleted |
| **Questionnaire answers** | RAM (session memory) | Current session only | Deleted when page refreshed (unless saved) |
| **Site code** | Browser localStorage | Device + Browser-specific | Persists across sessions |
| **Export CSVs** | User's downloads folder | Local file system | Until user deletes |

#### Storage Key

```javascript
localStorage Key: "bmgutscreen_v2"
Storage Size: ~100 KB – 5 MB (typical use, depending on patient count)
Browser Quota: 5–10 MB per domain (varies by browser)
```

### Database Structure

```javascript
Database Schema:
{
  patients: [
    {
      id: "1719252948-abcd5",           // Unique internal ID (timestamp + random)
      code: "CLINA-0001",               // Clinic-visible ID (Site Code + sequence)
      ref: "patient-reference-123",     // Optional clinic reference (e.g., MRN)
      name: "John Doe",
      age: 45,
      gender: "Male",
      visits: [
        {
          id: "1719252950-xyz12",       // Visit ID
          date: "2026-07-15",
          type: "Initial screening",
          answers: {
            gsrs_pain: 2,
            gsrs_bloating: 1,
            ... (all 30+ question answers)
          },
          extras: {
            bristol: 4,
            clusterFreq: { Reflux: null, Pain: 1, ... },
            dys: { postInfectious: true, gasFoul: 2, ... },
            rome: { painFreq: 2, onset: 2, ... },
            ... (driver/context data)
          }
        },
        {
          id: "1719339350-abc99",       // Follow-up visit
          date: "2026-08-15",
          type: "Follow-up",
          answers: { ... },
          extras: { ... }
        }
      ]
    },
    { id: "1719...", code: "CLINA-0002", name: "Jane Smith", ... }
  ],
  meta: {
    schemaVersion: 7,                  // Internal schema version
    remindEvery: 5,                    // Reminder threshold (days)
    visitsSinceExport: 0,              // Export tracking
    patientSeq: 42,                    // Auto-increment counter
    siteCode: "CLINA"                  // Site code for ID prefix
  }
}
```

### Data Flow: Questionnaire → Storage

```
Patient fills questionnaire
       ↓
Answers stored in RAM (answers object)
       ↓
User clicks "Save this response"
       ↓
Visit object created: {id, date, type, answers, extras}
       ↓
Visit appended to Patient.visits[]
       ↓
Entire database serialized to JSON
       ↓
localStorage.setItem("bmgutscreen_v2", JSON.stringify(db))
       ↓
Data persists on device
       ↓
User can "View results" → Loads visit from localStorage
       ↓
Clinician view, patient print, CSV export all read from this stored data
```

### Data Items Stored Per Visit

**Answers** (questionnaire responses):
- 15 GSRS core items (gsrs_pain, gsrs_bloating, etc.)
- 8 IM items (inflammation, immune signals)
- 5 BG items (brain-gut, mood, fatigue)
- 5 NU items (nutrient, malabsorption)
- 4 IMP items (functional impact)
- 6 AR items (pelvic floor, anorectal)
- 2 UG items (upper-GI dyspepsia)
- 3 SY items (autonomic, systemic)
- Plus optional questions and revealing items

**Extras** (drivers, context, history):
- Bristol stool form type
- Cluster frequency (per-cluster symptom days/week)
- Dysbiosis-R lens (post-infectious, food triggers, gas quality, etc.)
- Rome IV data (pain frequency, onset, stool associations)
- Medications (confounders: antibiotics, PPI, NSAID, GLP-1, opioids, etc.)
- Disruptors (ABx courses, surgery, etc.)
- Lifestyle (activity, alcohol, diet, sleep)
- Stress (PSS-4)
- Anthropometrics (height, weight, waist)
- Known conditions, family history, obstetric history
- Surgical history
- Other medications free-text

**Computed** (calculated, not user-input):
- NOT stored; re-computed on view from answers + extras

### Export & Data Portability

#### CSV Export

**What's exported**:
- All patients + all visits
- Each row = one visit
- Columns include: Patient ID, Date, All answers, All drivers, Index score, Trends, Patterns fired, Triage tier

**Format**: Standard CSV, importable to Excel/Google Sheets

**Where it goes**: User's Downloads folder (user manually saves, not automatic)

#### Merge Import

**How it works**:
1. User downloads CSV from Device 1
2. User opens app on Device 2
3. User selects "Import CSV" → selects file
4. App merges patients by ID (combines visit histories)
5. Merged database saved to Device 2 localStorage

**Merge logic**:
- If patient ID exists: appends new visits to existing patient
- If patient ID new: creates new patient record
- Prevents duplicates: visit IDs must match exactly to skip re-import

### Data Security & Privacy

#### What Stays Local (Never Sent Anywhere)

✅ All patient records  
✅ All questionnaire answers  
✅ All medical history  
✅ All clinical notes  
✅ All computed results (Index, patterns, triage tier)  

**Guarantee**: Offline-first app; zero cloud, zero authentication server, zero third-party APIs for data.

#### Data Deletion

Users can:
- **Delete single visit** → removes from Patient.visits[], updates localStorage
- **Delete entire patient record** → removes from patients[], updates localStorage
- **Clear browser localStorage** → deletes all app data
- **Clear browser cookies/cache** → does NOT delete localStorage (separate)

#### Data Export (For Research/Audits)

1. Download CSV via UI
2. Manually upload to secure server (Google Drive, SFTP, email, etc.)
3. App has no automatic sync; user controls what leaves their device

### Browser & Device Compatibility

| Browser | Storage Type | Capacity | Syncing |
|---------|--------------|----------|--------|
| Chrome | localStorage | 10 MB | None (unless profile-synced) |
| Firefox | localStorage | 10 MB | None |
| Safari | localStorage | 5 MB | None (unless iCloud sync enabled) |
| Edge | localStorage | 10 MB | None |
| Safari (iOS) | localStorage | 5 MB | None |
| Chrome (Android) | localStorage | 10 MB | None |

**Note**: If browser profile is synced (e.g., Chrome account sync), localStorage MAY replicate across devices, but this is browser-managed, not app-managed.

### Typical Data Footprint

```
Empty app: ~2 KB
10 patients × 5 visits each: ~500 KB
100 patients × 10 visits each: ~5 MB (near browser limit)
```

### Storage Troubleshooting

**"Storage write failed" error**:
- Browser localStorage quota exceeded
- **Fix**: Export & delete old patients, or use a different browser

**Data disappeared after clearing cache**:
- User cleared browser "Cookies and Cached Images"
- localStorage survives cache clear; but "Clear All Site Data" deletes it
- **Fix**: Don't clear "all site data" for this domain; export first

**Can't import CSV**:
- File format corrupted or incompatible
- **Fix**: Re-export from source device, verify CSV format

---

## Summary & Recommendations

### For Multi-Clinic Use

1. **Set a unique Site Code per clinic** (e.g., "CLINA", "CLINB")
2. **Share the single link** across all clinics
3. **Each clinic's patients auto-numbered** with their prefix
4. **Pool data later** via CSV export + merge import

### For Multi-Device Synchronization

1. **Not supported natively** — Each device has independent data
2. **Workaround**: Export from Device 1, import on Device 2
3. **Recommended**: Designate one "primary" clinic device as the source of truth
4. **Periodic backups**: Export CSV weekly as a safety net

### For Data Security

1. ✅ **Data never leaves the device** (offline-first architecture)
2. ✅ **No user login required** (no credentials to breach)
3. ✅ **No third-party servers** (only browser-local storage)
4. ⚠️ **User responsible for device security** (anyone with browser access can see data)
5. ⚠️ **Device storage loss = data loss** (no automatic backup; user must export)

### Recommended Workflow

```
Clinic A (Site: CLINA)
├─ Desktop Chrome: Questionnaires
├─ Periodic Export: CSV backup to secure folder
└─ Merge old data: Import on new device if needed

Clinic B (Site: CLINB)
├─ Different browser or different OS user profile
├─ Periodic Export: CSV backup to secure folder
└─ Merge imports from other Clinic B devices

Central Data Pool (Optional)
├─ Collect CSVs from all clinics
├─ Merge into master database
└─ Analyze trends across all sites
```

---

**Questions?** See the main CLINICIAN_HANDOFF.md for tool mechanics, or contact the development team for technical support.
