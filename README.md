# BikeShare
The Bike Share System is a platform that leverages G-Suite automation through Google Apps Script to streamline bike checkouts, returns, and inventory management.

# Design
The database in relational model.

## Tables and their Fields
### Bikes Status
Fields:
- **Bike ID**
- **Size**
- **Maintenance status**
- **Availability**
- **Last checkout date**
- **Last return date**
- **Current Usage Timer**
- **Total Usage Hours**
- **Most Recent User**
- **2nd Recent User**
- **3rd Recent User**
- **TempRecent (Hidden)**
- **Hash-ID(Hidden)** 
- **URL Link(Hidden)**
- **QR Code(Hidden)**

### User status
Fields:
- **Email**
- **Has unreturned bike**
- **Last checkout ID & Date**
- **Last return ID & Date**
- **# of checkouts**
- **# of returns**
- **# of mismatches**
- **# of usage hours**
- **# of overdue returns**
- **# first usage date**

### Checkout Logs
Fields:
- **Timestamp**
- **Email Address**
- **Scanned bike Hash-ID**
- **Did you check if this bike’s key is available at the front desk before you check it out?**
- **Confirm that this bike's condition is okay for you to ride before you submit this request**

### Return Logs
Fields:
- **Timestamp**
- **Email Address**
- **Enter Bike Name**
- **Confirm Bike Name**
- **Did you ride the exact bike that you originally checked out?**
- **If you did not or are not sure you rode the bike with the actual ID you checked out, please explain why.**
- **Are you returning on behalf of a friend?**
- **If you are returning on behalf of a friend, what is their name and/or email?**
- **Are there any errors/issues/concerns you'd like us to know about?**


### Report(system snapshots)
Fields:
- **Timestamp**
- **Recorded By**
- **Week**
- **Total # of Bikes**
- **Total # of Bikes in Repair**
- **# of Checked Out**
- **# of Overdue Bikes**
- **Available Bikes**
- **New users**
- **Late returners**
- **# of return mismatches**
- **emails with mismatches**
- **# of reported issues**
- **Total # of usage hrs**
- **Admin notes**

### Entity Relationship Diagram (ERD)
coming soon

## Object-Oriented Programming (OOP) Design

#### Core Classes:
1. **DatabaseManager** - Base class for all database operations with Google Sheets
2. **Bike** - Represents individual bikes with their status and operations
3. **User** - Represents system users with their checkout history and status
4. **CheckoutLog** - Handles checkout form submissions and validation
5. **ReturnLog** - Handles return form submissions and validation  
6. **Report** - Generates system snapshots and analytics
7. **BikeShareService** - Main service layer that orchestrates all operations

## Bike Names to Hash Spreadsheet Formula
To convert bike names to hash values, use the following formula in Google Sheets:
```excel
=UPPER(CONCAT(DEC2HEX(MOD(SUM(CODE(MID(A10,ROW(INDIRECT("1:"&LEN(A10))),1)))*13, 4096),3), DEC2HEX(MOD(SUM(CODE(MID(A10,ROW(INDIRECT("1:"&LEN(A10))),1)))*LEN(A10)*7, 4096),3)))
```
## Pre-fill link creation for Google Forms
To create pre-filled links for Google Forms, use the following format:
```excel
="https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url&entry.FIELD_ID=" & A1
```
Replace `FORM_ID` with your form's ID and `FIELD_ID` with the specific field ID you want to pre-fill. The value in cell `A1` will be automatically filled in the form.

## Generate QR Codes for URLS
To generate QR codes for URLs, you can use the following Google Sheets formula:
```excel
=IMAGE("https://quickchart.io/qr?text="&ENCODEURL(N2))
```
Replace `N2` with the cell containing the URL you want to convert into a QR code. This will generate a QR code image that can be scanned to access the URL directly.

## Development Notes:
## Database Reset and Error Handling Design

### 1. Clear Sheets Method & Config
- **Purpose:** Reset the database to a clean state for maintenance or troubleshooting.
- **Method:**  
    - Implement a `clearSheets()` function in `DatabaseManager` to wipe all relevant tables' specified range for (Bikes Status, User Status, Checkout Logs, Return Logs, Reports).
    - Use a configuration object (`RESET_CONFIG`) to specify which sheets/tables to clear and any exceptions (e.g., preserve admin notes, whether to clear all data or specific ranges).
    - Log reset actions for audit purposes.

### 2. Mismatch Handling
- **Current Approach:** Flag mismatches and add comments.
- **Improved Approach: Validation logic**  
    - There are two kinds of mismatches: 
        1. When a user submits a return form response's bike name is different from confirm bike name entry. 
            1. Action: use a dedicated string matching method to check if it was a tolerable typo and has closely similar bikeName in the system or obvious mismatch.   
                1. If obvious mismatch, flag the record and notify the user to re-submit.
                2. If it was a typo(misspelling of 2 characters), automatically correct the record if possible, then continue processing.
        2. If the bike name submitted or derived from auto-spell correction is found is a valid bike name but it's not what the user checked out or they have no unreturned bikes, or they are first time user of the bike share program.

            1. case 1: different from checked out. Then, check related response for: "Did you ride the exact bike that you originally checked out?"
                1. If "Yes",Then, send a notification to the user: "The bike you are trying to return is not the one you checked out. Please check your checkout confirmation email/ key you have if you forgot the bike name."
                2. If "No" or "Not sure". Then, check related response for: "If you did not or are not sure you rode the checked-out bike, please explain why."
                    - If response is "🧠 I forgot which bike I checked out", then send a notification to the user: "No worries! Please check your checkout confirmation email for the bike details."
                    - If response is "🔁 I swapped bikes with a friend during use[check yes in next field, and provide their email]", then:
                        1. If "Yes", then check related response for: "What is your friend's name and/or email?" 
                            1. Swap the checkout records for both users and add a comment to both users' records indicating the swap happened.
                            2. process user as returning their bike("new swapped bike").
                        2. send notification to the user: "Thanks for letting us know! We update your checkout records accordingly. We confirm that you checked out a bike with the name [bike name], then swapped with [friend's name/email] who has checked out a bike with the name [friend's bike name]. So, our records swapped your checkouts and we expected your friend to return what you had checked out as you returned what he checked out."
                    - If response is "🛠️ The original bike had a problem, so I rode a different one", then:
                        1. check the actual bike they had checked out. Then mark it's maintenance status as "Has Issue", and "availability" as "Out of Service".
                        2. Process the return as a successful return of the bike they checked out.
                        3. send a notification to the user: "Thanks for letting us know! you successfully returned your bike, and we will fix soon the bike reported as having an issue."
                        4. send a notification to the admin: "A bike with the name [bike name] has been reported by [user email]."
            2. case 2: no unreturned bikes or first time user. Then, check related response for: "Are you returning on behalf of a friend?"
                1. If "Yes",
                    - check related response for: "If you are returning on behalf of a friend, what is their name and/or email?"
                    - If the friend's name/email is found, update logs accordingly. 
                    - Notify both parties: "you successfully returned a bike X on behalf of your friend [friend's name/email]." AND " (friend's name/email) successfully returned a bike X on your behalf".
                2. If "No" and "is first time user",
                    - send a notification: "It seems this is like you have never checked out recently. Are you sure you are returning a bike? If so, please check your checkout confirmation email or are you returning a bike for a friend? If so, re-submit the form with your friend's name/email."
                3. If "No" and "has no unreturned bikes",
                    - send a notification: "It seems like you were already cleared up with all previous checkouts. Are you sure you are returning a bike? If so, there might be a system error, please send us email with this format: SUBJECT: Bike Share System Error - Return Mismatch. BODY: I am trying to return a bike but the system says I have no unreturned bikes. My email is [your email]. The bike name I am trying to return is [bike name]."
        2. Maintain a tolerance for minor input errors (slight name typos).
    - Enforce strict matching for bike Hash-IDs to ensure the returned bike matches the checked-out bike.
    - Allow minor input errors by applying fuzzy matching for bike names and user emails (e.g., small typos, misspellings, or case differences).
    - If a correction has been made to the bike name or user email: 
        - flag that corresponding entries.
        - explicitly notify the user and ask them to report immediately if the correction is not what they expected.

### 4. Handling Returns on Behalf of Friends
- **Detection:**  
    - Parse return forms for indications that the user is returning a bike for someone else.
    - Update logs to reflect both the actual user and the proxy returner.
    - Notify both parties if necessary.

### 5. Error Codes & Parsing System
- **Error Convention:**  
    - Define a set of error codes (e.g., `ERR_MISMATCH`, `ERR_INVALID_INPUT`, `ERR_PROXY_RETURN`) in a central `ERROR_CONFIG`.
    - Map each error code to a response action and notification template.
    - Use error codes to categorize dashboard flags and automate comments.

### 6. Notification System (Internal Structure)
- **Design:**  
    - Build a notification manager that triggers emails or dashboard alerts based on error codes.
    - Centralize notification templates for easy updates.
    - Link error codes to user-facing messages and admin comments for dynamic handling.

