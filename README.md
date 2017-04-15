# Text4Change (originally 'ich8' ["I see hate"])

This app allows users to text a phone number with a report and location, and aggregates these reports by location.

Flow:

1. User texts phone number with a report (e.g. "I was walking down the street and someone told me and my family that we should 'go back to where we came from'"

2. Application receives message, opens a session, and responds with a request for location

3. User responds with a location including a 5-digit zip code somewhere in the response (e.g. "Downtown San Jose 95113")

4. Application receives location, creates/stores a report in Mongo, closes the user's session, and responds with a "Thank you" message. User's on the website will see an update when the DB is re-polled (for now, every 10s). If they click the update, the new report will populate the page.

Note: Development/clean up still in progress.
