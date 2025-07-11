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
      bikeName: 'King',
      confirmBikeName: 'King',
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

      const bikeNameItem = form.getItemById(this.FIELD_IDS.BIKE_NAME).asTextItem();
      formResponse.withItemResponse(bikeNameItem.createResponse(formData.bikeName));

      const confirmBikeNameItem = form.getItemById(this.FIELD_IDS.CONFIRM_BIKE_NAME).asTextItem();
      formResponse.withItemResponse(confirmBikeNameItem.createResponse(formData.confirmBikeName));

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
    bikeName,
    confirmBikeName, 
    assureRodeBike = 'Yes', 
    mismatchExplanation = [], 
    returningForFriend = 'No', 
    friendEmail = '', 
    issuesConcerns = ''
    ) {
    const customData = {
      userEmail: userEmail,
      bikeName: bikeName,
      confirmBikeName: confirmBikeName || bikeName,
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
        const bikeName = isRandom ? CONFIG.BIKE_NAMES[randomIndex] : defaultBike;
        console.log(`\n-----Email:${emailAddress}-------Bike:${bikeName}--------`);
        results.push(this.createCustomReturn(
            emailAddress,
            bikeName,
            bikeName,
            'Yes',
            [], 
            'No',
            '', 
            '' 
        ));
        // Small delay between submissions
        Utilities.sleep(3000);
    }
    
    return results;
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
        bikeName,
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
            bikeName,
            confirmCode, 
            assureRodeBike, 
            mismatchExplanation.toString(), 
            returningForFriend,
            friendEmail, 
            issuesConcerns
        ];

        // Append the entry to the return logs sheet
        this.db.appendRow(this.returnSheet, entry);
        this.db.sortByColumn(null, this.returnSheet);

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
  const response = simulator.createReturnEntry(
    'test101@amherst.edu',
    'Meiklejohn',
    'Meiklejohn',
    'Yes',
    [],
    'No',
    '',
    ''
  );
  simulateHandleOnFormSubmit(CONFIG.SHEETS.RETURN_LOGS.NAME, response);
}