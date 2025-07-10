/**
 * BikeShare Return Form Simulator Class
 * Handles simulation of return form submissions for testing
 * 
 * Form Structure:
 * [0] [Id=1224208618] Email
 * [1] [Id=1916897857] Enter Bike Name/Code
 * [2] [Id=1814237596] Confirm Bike Name/Code
 * [3] [Id=788338430] Did you ride the bike with the actual code/name you checked out?
 * [4] [Id=993479484] If you did not or are not sure you rode the bike with the actual ID you checked out, please explain why.
 * [5] [Id=2017212460] Are you returning on behalf of a friend?
 * [6] [Id=552890597] If you are returning on behalf of a friend, what is their email?
 * [7] [Id=71285803] Are there any errors/issues/concerns you'd like us to know about?
 */

// ===========================================================================
// Create the form responses and submit to trigger the onReturnFormSubmit function
// =============================================================================
class ReturnFullSimulator {
  constructor() {
    this.formId = CONFIG.FORMS.RETURN_FORM_ID;
    this.FIELD_IDS = CONFIG.FORMS.RETURN_FIELD_IDS;
  }

  simulateReturn(responseData = null) {
    // Default response data
    const defaultResponse = {
      userEmail: 'test002@amherst.edu',
      bikeCode: 'King',
      confirmBikeCode: 'King',
      assureRodeBike: 'Yes',
      mismatchExplanation: [],
      returningForFriend: 'No',
      friendEmail: '',
      issuesConcerns: ''
    };

    // Use provided data or default
    const formData = responseData || defaultResponse;

    try {
      const form = FormApp.openById(this.formId);
      const formResponse = form.createResponse();
      
      // Set value for each form item using IDs (when IDs are available)
      const userEmailItem = form.getItemById(this.FIELD_IDS.EMAIL).asTextItem();
      formResponse.withItemResponse(userEmailItem.createResponse(formData.userEmail));

      const bikeCodeItem = form.getItemById(this.FIELD_IDS.BIKE_NAME).asTextItem();
      formResponse.withItemResponse(bikeCodeItem.createResponse(formData.bikeCode));

      const confirmBikeCodeItem = form.getItemById(this.FIELD_IDS.CONFIRM_BIKE_NAME).asTextItem();
      formResponse.withItemResponse(confirmBikeCodeItem.createResponse(formData.confirmBikeCode));

      const assureRodeBikeItem = form.getItemById(this.FIELD_IDS.ASSURE_RODE_BIKE).asMultipleChoiceItem();
      formResponse.withItemResponse(assureRodeBikeItem.createResponse(formData.assureRodeBike));

      const mismatchExplanationItem = form.getItemById(this.FIELD_IDS.BIKE_MISMATCH_EXPLANATION).asCheckboxItem();
      formResponse.withItemResponse(mismatchExplanationItem.createResponse(formData.mismatchExplanation));

      const friendReturnItem = form.getItemById(this.FIELD_IDS.RETURNING_FOR_FRIEND).asMultipleChoiceItem();
      formResponse.withItemResponse(friendReturnItem.createResponse(formData.returningForFriend));

      const friendEmailItem = form.getItemById(this.FIELD_IDS.FRIEND_EMAIL).asTextItem();
      formResponse.withItemResponse(friendEmailItem.createResponse(formData.friendEmail));

      const issuesItem = form.getItemById(this.FIELD_IDS.ISSUES_CONCERNS).asParagraphTextItem();
      formResponse.withItemResponse(issuesItem.createResponse(formData.issuesConcerns));

      // Submit the form response
      const submittedResponse = formResponse.submit();

      return {
        success: true,
        responseId: submittedResponse.getId(),
        timestamp: submittedResponse.getTimestamp(),
        formData: formData,
        message: 'Return simulation completed successfully'
      };
      
    } catch (error) {
      console.error('Error simulating return:', error);
      return {
        success: false,
        error: error.message,
        formData: formData
      };
    }
  }

  createCustomReturn(
    userEmail, 
    bikeCode,
    confirmBikeCode, 
    assureRodeBike = 'Yes', 
    mismatchExplanation = [], 
    returningForFriend = 'No', 
    friendEmail = '', 
    issuesConcerns = ''
    ) {
    const customData = {
      userEmail: userEmail,
      bikeCode: bikeCode,
      confirmBikeCode: confirmBikeCode || bikeCode,
      assureRodeBike: assureRodeBike,
      mismatchExplanation: mismatchExplanation,
      returningForFriend: returningForFriend,
      friendEmail: friendEmail,
      issuesConcerns: issuesConcerns
    };

    return this.simulateReturn(customData);
  }

  simulateMultipleReturns(num=2,isRandom=true,root="test",defaultBike="King") {
    const results = [];
    for (let i = 0; i < num; i++) {
        let finalPart = i < 10 ? '00' + i : i < 100 ? '0' + i : i;
        let emailAddress = root + finalPart + '@amherst.edu';
        const randomIndex = Math.floor(Math.random() * CONFIG.BIKE_NAMES.length);
        const bikeCode = isRandom ? CONFIG.BIKE_NAMES[randomIndex] : defaultBike;
        console.log(`\n-----Email:${emailAddress}-------Bike:${bikeCode}--------`);
        results.push(this.createCustomReturn(
            emailAddress,
            bikeCode,
            bikeCode,
            'Yes',
            [], 
            'No',
            '', 
            '' 
        ));
        // Small delay between submissions
        Utilities.sleep(500);
    }
    
    return results;
  }

  getTestScenarios() {
    return [
        { // Example scenario with correct data
            userEmail:'test001@amherst.edu', 
            bikeCode: 'Bike001',
            confirmBikeCode: 'Bike001',
            assureRodeBike: 'Yes',
            mismatchExplanation: [],
            returningForFriend: 'No',
            friendEmail: '',
            issuesConcerns: ''
        },
        {  // Example scenario with mismatch
            userEmail: 'test002@amherst.edu',
            bikeCode: 'Bike002',
            confirmBikeCode: 'Bike102',
            assureRodeBike: 'Yes',
            mismatchExplanation: [],
            returningForFriend: 'No',
            friendEmail: '',
            issuesConcerns: ''
        },
        {  // Example scenario with returning for a friend
            userEmail: 'test003@amherst.edu',
            bikeCode: 'Bike003',
            confirmBikeCode: 'Bike003',
            assureRodeBike: 'Yes',
            mismatchExplanation: [],
            returningForFriend: 'Yes',
            friendEmail: 'friend003@amherst.edu',
            issuesConcerns: ''
        },
        { // Example scenario with not sure about the bike ridden
            userEmail: 'test004@amherst.edu',
            bikeCode: 'Bike004',
            confirmBikeCode: 'Bike005',
            assureRodeBike: 'Yes',
            mismatchExplanation: ['🧾 I filled out the wrong ID during checkout'],
            returningForFriend: 'No',
            friendEmail: '',
            issuesConcerns: ''
        }
    ];
  }
}

// ===========================================================================
// Simulate checkout by creating a spreadsheet entry then, call form submission functions manually
// ===========================================================================

class ReturnVirtualSimulator {
    constructor() {
        this.db = new DatabaseManager();
        this.returnSheet = CONFIG.SHEETS.RETURN_LOGS.NAME;
    }

    createReturnEntry(
        email, 
        bikeCode,
        confirmCode, 
        assureRodeBike = 'Yes', 
        mismatchExplanation = [], 
        returningForFriend = 'No',
        friendEmail = '', 
        issuesConcerns = ''
    ) {
        const entry = [
            new Date(),
            email, 
            bikeCode,
            confirmCode, 
            assureRodeBike, 
            mismatchExplanation.toString(), 
            returningForFriend,
            friendEmail, 
            issuesConcerns
        ];

        // Append the entry to the return logs sheet
        this.db.appendRow(this.returnSheet, entry);

        // Return the entry
        return entry;
    }

}

function simulateFullReturn() {
  const simulator = new ReturnFullSimulator();
  // return simulator.simulateReturn();
  // return simulator.createCustomReturn('test103@amherst.edu','King','Moore','Yes',['🔁 I swapped bikes with a friend during use'],'Yes','friend103@amherst.edu','Wheel was loose')
  return simulator.simulateMultipleReturns(num=5);
}

function simulateVirtualReturn() {
  const simulator = new ReturnVirtualSimulator();
  simulator.createReturnEntry(
    'test504@amherst.edu',
    'King',
    'King',
    'Yes',
    [],
    'No',
    '',
    ''
  );
  simulateHandleOnFormSubmit(CONFIG.SHEETS.RETURN_LOGS.NAME, debugging = true);
}