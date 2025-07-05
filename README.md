# BikeShare
The Bike Share System is a platform that leverages G-Suite automation through Google Apps Script to streamline bike checkouts, returns, and maintenance management.

# Design
The database in relational model.

## Tables and their Fields
### Bikes Status
Fields:
- **Bike ID**
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

### Checkout Logs
Fields:
- **Timestamp**
- **Email Address**
- **Enter the bike name/code from the key**
- **Confirm the bike name/code by entering it again**
- **Did you check if this bike’s key is available at the front desk before you check it out?**
- **Confirm that this bike's condition is okay for you to ride before you submit this request**

### Return Logs
Fields:
- **Timestamp**
- **Email Address**
- **Enter your Student ID**
- **Bike Name/Code**
- **Confirm Bike Name/Code**
- **Did you ride the bike with the actual code/name you checked out?**
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
