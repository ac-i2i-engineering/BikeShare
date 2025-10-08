const codeToPlaceholders = {
  // --- CONFIRMATION CODES ---
  "CFM_USR_COT_001": {
    "entryNote": [],
    "userNotification": ["bikeName"],
    "adminNotification": [],
    "devNotification": []
  },
  "CFM_USR_RET_001": {
    "entryNote": [],
    "userNotification": ["bikeName"],
    "adminNotification": [],
    "devNotification": []
  },
  "CFM_USR_RET_002": {
    "entryNote": ["userEmail", "friendEmail", "bikeName"],
    "userNotification": ["friendEmail", "bikeName"],
    "adminNotification": [],
    "devNotification": []
  },
  "CFM_USR_RET_003": {
    "entryNote": ["friendEmail", "bikeName"],
    "userNotification": ["bikeName", "friendEmail"],
    "adminNotification": [],
    "devNotification": []
  },
  "CFM_USR_RET_004": {
    "entryNote": ["bikeName", "lastCheckoutName"],
    "userNotification": ["bikeName", "lastCheckoutName"],
    "adminNotification": [],
    "devNotification": []
  },
  "CFM_ADMIN_RESET_001": {
    "entryNote": [],
    "userNotification": [],
    "adminNotification": ["resetDate"],
    "devNotification": []
  },
  
  // --- ERROR CODES ---
  "ERR_OPR_COR_001": {
    "entryNote": [],
    "userNotification": [],
    "adminNotification": [],
    "devNotification": []
  },
  "ERR_USR_COT_001": {
    "entryNote": [],
    "userNotification": ["bikeName"],
    "adminNotification": [],
    "devNotification": []
  },
  "ERR_USR_COT_002": {
    "entryNote": ["unreturnedBikeName", "lastCheckoutDate"],
    "userNotification": ["unreturnedBikeName", "lastCheckoutDate"],
    "adminNotification": [],
    "devNotification": []
  },
  "ERR_USR_COT_003": {
    "entryNote": ["bikeHash"],
    "userNotification": ["bikeHash"],
    "adminNotification": [],
    "devNotification": []
  },
  "ERR_USR_RET_001": {
    "entryNote": ["bikeName", "confirmBikeName"],
    "userNotification": ["bikeName"],
    "adminNotification": [],
    "devNotification": []
  },
  "ERR_USR_RET_002": {
    "entryNote": ["bikeName"],
    "userNotification": ["bikeName"],
    "adminNotification": [],
    "devNotification": []
  },
  "ERR_USR_RET_003": {
    "entryNote": ["friendEmail"],
    "userNotification": ["friendEmail"],
    "adminNotification": [],
    "devNotification": []
  },
  "ERR_USR_RET_004": {
    "entryNote": [],
    "userNotification": [],
    "adminNotification": [],
    "devNotification": []
  },
  "ERR_USR_RET_005": {
    "entryNote": [],
    "userNotification": [],
    "adminNotification": [],
    "devNotification": []
  },
  "ERR_USR_RET_006": {
    "entryNote": ["lastCheckoutName", "lastCheckoutDate", "lastReturnDate"],
    "userNotification": ["lastCheckoutName", "lastCheckoutDate", "lastReturnDate"],
    "adminNotification": [],
    "devNotification": []
  },
  "ERR_USR_RET_007": {
    "entryNote": ["bikeName", "lastCheckoutName"],
    "userNotification": ["bikeName", "lastCheckoutName"],
    "adminNotification": [],
    "devNotification": []
  },
  "ERR_USR_RET_008": {
    "entryNote": ["userEmail", "bikeName", "friendEmail", "errorMessage"],
    "userNotification": ["bikeName", "friendEmail"],
    "adminNotification": ["timestamp", "userEmail", "bikeName", "friendEmail", "errorMessage"],
    "devNotification": ["timestamp", "userEmail", "bikeName", "friendEmail", "errorMessage"]
  },
  "ERR_USR_EMAIL_001": {
    "entryNote": [],
    "userNotification": [],
    "adminNotification": [],
    "devNotification": []
  }
};

const placeholderToCodes = {
  "bikeHash": [
    "ERR_USR_COT_003"
  ],
  "bikeName": [
    "CFM_USR_COT_001",
    "CFM_USR_RET_001",
    "CFM_USR_RET_002",
    "CFM_USR_RET_003",
    "CFM_USR_RET_004",
    "ERR_USR_COT_001",
    "ERR_USR_RET_001",
    "ERR_USR_RET_002",
    "ERR_USR_RET_007",
    "ERR_USR_RET_008"
  ],
  "confirmBikeName": [
    "ERR_USR_RET_001"
  ],
  "errorMessage": [
    "ERR_USR_RET_008"
  ],
  "friendEmail": [
    "CFM_USR_RET_002",
    "CFM_USR_RET_003",
    "ERR_USR_RET_003",
    "ERR_USR_RET_008"
  ],
  "lastCheckoutDate": [
    "ERR_USR_COT_002",
    "ERR_USR_RET_006"
  ],
  "lastCheckoutName": [
    "CFM_USR_RET_004",
    "ERR_USR_RET_007",
    "ERR_USR_RET_006"
  ],
  "lastReturnDate": [
    "ERR_USR_RET_006"
  ],
  "resetDate": [
    "CFM_ADMIN_RESET_001"
  ],
  "timestamp": [
    "ERR_USR_RET_008"
  ],
  "unreturnedBikeName": [
    "ERR_USR_COT_002"
  ],
  "userEmail": [
    "CFM_USR_RET_002",
    "ERR_USR_RET_008"
  ]
}
