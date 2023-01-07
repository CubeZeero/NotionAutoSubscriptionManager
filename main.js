//変更する部分///////////////////////////////////////////////
var database_id = 'DATABASE_ID_HERE';
var token = 'TOKEN_HERE';
var timeZone = 'JST'
var emailAddress = 'EMAIL_HERE'
///////////////////////////////////////////////////////////

function sendEmail(serviceName, notifyDate, serviceFee, nextPaymentDay) {

 var emailSubject = '【Notionサブスク管理】' + serviceName + 'の更新が' + notifyDate + '日前になりました'
 
 var emailBody = `
   ` + serviceName + `の更新が` + notifyDate + `日前になりました
   
   サービス名: ` + serviceName + `
   支払い料金: ¥` + String(serviceFee) + `
   更新日: ` + nextPaymentDay.replace(/-/g, '/') + `
 `

 GmailApp.sendEmail(emailAddress, emailSubject, emailBody)
}

function checkSubscription() {

  const get_dbData_url = 'https://api.notion.com/v1/databases/' + database_id + '/query';

  var headers = {
    'content-type': 'application/json; charset=UTF-8',
    'Authorization': 'Bearer ' + token,
    'Notion-Version': '2022-06-28',
  };

  var get_dbData_options = {
    'method': 'post',
    'headers': headers,
    "muteHttpExceptions": true
  };

  var notion_data = UrlFetchApp.fetch(get_dbData_url, get_dbData_options);
  notion_db_data = JSON.parse(notion_data);

  for (let i = 0; i < notion_db_data['results'].length; i++){

    var date_obj = new Date();
    var date_milliseconds = date_obj.getTime()

    var paymentDate_next = notion_db_data['results'][i]['properties']['次の更新日']['date']['start']

    var remainingDays = Number(notion_db_data['results'][i]['properties']['更新までの残日数']['formula']['string'].replace('日', '')) - 1
    var alertDay = Number(notion_db_data['results'][i]['properties']['更新日の通知(n日前)']['number'])
    var date_obj_paymentDate = new Date(paymentDate_next);

    if(remainingDays == alertDay &&
        notion_db_data['results'][i]['properties']['通知の有無']['select']['name'] == '有効' &&
        notion_db_data['results'][i]['properties']['利用状況']['select']['name'] == '利用中'){

      sendEmail(notion_db_data['results'][i]['properties']['サービス名']['title'][0]['plain_text'],
                remainingDays,
                notion_db_data['results'][i]['properties']['利用料金']['number'],
                paymentDate_next)
    }
    
    if(date_obj_paymentDate.getTime() < date_milliseconds){

      if(notion_db_data['results'][i]['properties']['更新間隔']['select']['name'] == '月'){
          date_obj_paymentDate.setMonth(date_obj.getMonth() + 1);
          date_obj_paymentDate.setFullYear(date_obj.getFullYear());
      }

      if(notion_db_data['results'][i]['properties']['更新間隔']['select']['name'] == '年'){
        date_obj_paymentDate.setFullYear(date_obj_paymentDate.getFullYear() + 1);
      }

      var patch_dbData = {"properties": {'次の更新日': {"date": {'start': Utilities.formatDate(date_obj_paymentDate, timeZone, 'yyyy-MM-dd')}}}}

      let patch_dbData_options = {
            'method': 'patch',
            'headers': headers,
            'payload': JSON.stringify(patch_dbData),
            'muteHttpExceptions': true
          };

      UrlFetchApp.fetch('https://api.notion.com/v1/pages/' + notion_db_data['results'][i]['id'], patch_dbData_options);
    }
    Utilities.sleep(1000)
  }
}
