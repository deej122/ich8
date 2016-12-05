from flask import Flask,render_template,json,jsonify,request,redirect,session
from pymongo import MongoClient
from flask_moment import Moment
from twilio.rest import TwilioRestClient
from bson import ObjectId
import twilio.twiml
import datetime
import uuid
import re

client = MongoClient('localhost:27017')
db = client.ReportData

application = Flask(__name__)
application.secret_key = 'Bo\xaa]txn\xee\x8f\xb1\x15\x02s\xb8=JQS|\xe0\x15\xf4\x1d\x08'

moment = Moment(application)

@application.route('/')
def showReportList():
    return render_template('feed.html')

@application.route('/<location>')
def showLocationReportList(location):
    return render_template('location_feed.html')

#get reports for a specific location    
@application.route('/<location>/getReports',methods=['POST'])
def getLocationReports(location):
    try:
        #search for reports in location based on url
        reports = db.Reports.find({'location': location}).sort([('$natural', -1)]).limit(50)
        reportList = []
        #create list of reports to send to fe
        for report in reports:
            reportItem = {
                    'description':report['description'],
                    'location':report['location'],
                    'time_received':report['_id'].generation_time.isoformat()
                    }
            reportList.append(reportItem)
    except Exception,e:
        return str(e)
    return json.dumps(reportList)
    
@application.route("/createReport", methods=['POST'])
def createReport():
    try:
        json_data = request.json['info']
        reportDescription = json_data['description']
        reportLocation = json_data['location']
        reportTime = datetime.datetime.now()

        db.Reports.insert_one({
            'description':reportDescription, 'location':reportLocation, 'time_received':reportTime
            })
        return jsonify(status='OK', message='successfully added to the database')
    except Exception,e:
        return jsonify(status='ERROR',message=str(e))

#Check for new reports (doesn't work right yet)
@application.route("/getNewReports",methods=['POST'])
def getNewReports():
    try:
        json_data = request.json['location']
        location = json_data
        if location == 'all':
            json_data = request.json['latest_post']
            latest_post = json_data
            offset = db.Reports.find({'_id': ObjectId(latest_post)}).count()
            print offset
            reports = db.Reports.find().skip(db.Reports.count() - offset).limit(10)
            reports = reports.sort([('$natural', 1)])
            reportList = []
            for report in reports:
                reportItem = {
                        'description':report['description'],
                        'location':report['location'],
                        'time_received':report['_id'].generation_time.isoformat(),
                        'id':str(report['_id'])
                        }
                reportList.append(reportItem)
            reportList.append({'count': db.Reports.count()})
        else:
            json_data = request.json['latest_post']
            latest_post = json_data
            offset = db.Reports.find({'_id': ObjectId(latest_post)}).count()
            print offset
            reports = db.Reports.find({'location': location}).skip(db.Reports.find({'location': location}).count() - offset).limit(10)
            reports = reports.sort([('$natural', 1)])
            reportList = []
            for report in reports:
                reportItem = {
                        'description':report['description'],
                        'location':report['location'],
                        'time_received':report['_id'].generation_time.isoformat(),
                        'id':str(report['_id'])
                        }
                reportList.append(reportItem)
            reportList.append({'count': db.Reports.find({'location': location}).count()})
    except Exception,e:
        return str(e)
    return json.dumps(reportList)
    
#get initial, first page of reports
@application.route("/getReports",methods=['POST'])
def getReports():
    try:
        json_data = request.json['location']
        location = json_data
        if location == 'all' :
            #Find ten reports, sorted in order from newest to oldest
            reports = db.Reports.find().sort([('$natural', -1)]).limit(10)
            reportList = []
            #for every report grab this information
            for report in reports:
                reportItem = {
                        'description':report['description'],
                        'location':report['location'],
                        'time_received':report['_id'].generation_time.isoformat(),
                        'id':str(report['_id'])
                        }
                #add the report to our list to send to fe
                reportList.append(reportItem)
            #add an object that contains total number of reports in db
            reportList.append({'count': db.Reports.count()})
        else:
            print location
            #search for reports in location based on url
            reports = db.Reports.find({'location': location}).sort([('$natural', -1)]).limit(10)
            reportList = []
            #create list of reports to send to fe
            for report in reports:
                reportItem = {
                        'description':report['description'],
                        'location':report['location'],
                        'time_received':report['_id'].generation_time.isoformat(),
                        'id':str(report['_id'])
                        }
                reportList.append(reportItem)
            #add an object that contains total number of reports in db
            reportList.append({'count': db.Reports.find({'location': location}).count()})
    except Exception,e:
        return str(e)
    return json.dumps(reportList)
    
#get next ten reports, subsequent pages
@application.route("/getMoreReports",methods=['POST'])
def getMoreReports():
    try:
        json_data = request.json['location']
        location = json_data
        if location == 'all' :
            #find current page_num (passed from fe)
            json_data = request.json['page_num']
            page_num = json_data
            #only show 10 items per page
            per_page = 10
            #offset equals what page we're on times total reports per page (tells us where to start)
            offset = page_num * per_page
            print offset
            #starting at offset position, grab next 10 reports in order from newest to oldest
            reports = db.Reports.find().sort([('$natural', -1)]).skip(offset).limit(per_page)
            reportList = []
            #for every report grab this information
            for report in reports:
                reportItem = {
                        'description':report['description'],
                        'location':report['location'],
                        'time_received':report['_id'].generation_time.isoformat(),
                        'id':str(report['_id'])
                        }
                #add the report to our list to send to fe
                reportList.append(reportItem)
            #add an object that contains total number of reports in db
            reportList.append({'count': db.Reports.count()})
        else:
            #find current page_num (passed from fe)
            json_data = request.json['page_num']
            page_num = json_data
            #only show 10 items per page
            per_page = 10
            #offset equals what page we're on times total reports per page (tells us where to start)
            offset = page_num * per_page
            print offset
            #starting at offset position, grab next 10 reports in order from newest to oldest
            reports = db.Reports.find({'location': location}).sort([('$natural', -1)]).skip(offset).limit(per_page)
            reportList = []
            #for every report grab this information
            for report in reports:
                reportItem = {
                        'description':report['description'],
                        'location':report['location'],
                        'time_received':report['_id'].generation_time.isoformat(),
                        'id':str(report['_id'])
                        }
                #add the report to our list to send to fe
                reportList.append(reportItem)
            #add an object that contains total number of reports in db
            reportList.append({'count': db.Reports.find({'location': location}).count()})
    except Exception,e:
        return str(e)
    return json.dumps(reportList)
    
@application.route("/receiveIncomingReport",methods=['GET', 'POST'])
def createReportFromText():
    """Respond to incoming calls with a simple text message."""
    
    # session = request.session
    #remember that user in inside a session with this id
    #first set when first text is received (containing report body)
    mid_post = session.get('mid_post_id')
    
    #if user is not in a session already
    if not mid_post:
        try:
            #store from and body in the session
            session['from_num'] = request.values.get('From')
            session['message_body'] = request.values.get('Body')
            
            # db.Reports.insert_one({
            #     'description':message_body, 'location':location, 'time_received':time_received, 'owner':from_num
            #     })
            #create a unique session id to remember they're in a session
            session['mid_post_id'] = uuid.uuid4()
            #ask the user the second question - where did the event occur?
            resp = twilio.twiml.Response()
            resp.message("Where did this occur? Please include a 5-digit zip-code in your description.")
            return str(resp)
        #if there's an error let the user know and clear their session
        except Exception,e:
            session.clear()
            resp = twilio.twiml.Response()
            resp.message("Sorry, there was an issue creating your report. Please try again! " + str(e) )
            return str(resp)
    #if they are in a session (already submitted a post successfullt)
    else:
        try:
            #grab the location from the body of the message
            full_location = request.values.get('Body')
            #parse for zipcode using regex
            zip_code = re.search('(\d{5})([- ])?(\d{4})?', full_location)
            #variables for easy reading
            from_num = session['from_num']
            message_body = session['message_body']
            #if there is no zipcode ask them to resend the message with a zipcode this time
            if zip_code is None:
                resp = twilio.twiml.Response()
                resp.message("Sorry, looks like you didn't include a zip code. Please re-send your location with a 5-digit zip-code included.")
                return str(resp)
            #if there is a zipcode continue
            else:
                try:
                    #in case the zipcode is longer than 5 chars (expanded zip or something) save a trimmed version, also
                    zip_code = zip_code.group(0)
                    trimmed_zip_code = zip_code[:5]
                    #store post in the db
                    db.Reports.insert_one({
                        'description':message_body, 'full_location':full_location, 'location': trimmed_zip_code, 'full_zip_code': zip_code, 'owner':from_num
                        })
                    #clear the user session, they are done now. Let them know.
                    session.clear()
                    resp = twilio.twiml.Response()
                    resp.message("Your post was made successfully. Thank you for seeing hate and calling it out - keep it up!")
                    return str(resp)
                except Exception,e:
                    #if there was an error ask them to try sending  location again
                    resp = twilio.twiml.Response()
                    resp.message("Sorry, there was an issue creating your report. Please send your location, again!" + str(e))
                    return str(resp)
        #if there was some other error, clear the session and let them know
        except Exception,e:
            session.clear()
            resp = twilio.twiml.Response()
            resp.message("Sorry, there was an issue creating your report. Please send your location, again!" + str(e) )
            return str(resp)
    
if __name__ == "__main__":
    application.run(host='0.0.0.0')