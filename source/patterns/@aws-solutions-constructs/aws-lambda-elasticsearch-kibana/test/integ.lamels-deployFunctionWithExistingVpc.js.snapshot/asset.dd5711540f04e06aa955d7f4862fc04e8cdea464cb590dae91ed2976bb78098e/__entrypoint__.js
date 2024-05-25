"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.withRetries=exports.handler=exports.external=void 0;const https=require("https"),url=require("url");exports.external={sendHttpRequest:defaultSendHttpRequest,log:defaultLog,includeStackTraces:!0,userHandlerIndex:"./index"};const CREATE_FAILED_PHYSICAL_ID_MARKER="AWSCDK::CustomResourceProviderFramework::CREATE_FAILED",MISSING_PHYSICAL_ID_MARKER="AWSCDK::CustomResourceProviderFramework::MISSING_PHYSICAL_ID";async function handler(event,context){const sanitizedEvent={...event,ResponseURL:"..."};if(exports.external.log(JSON.stringify(sanitizedEvent,void 0,2)),event.RequestType==="Delete"&&event.PhysicalResourceId===CREATE_FAILED_PHYSICAL_ID_MARKER){exports.external.log("ignoring DELETE event caused by a failed CREATE event"),await submitResponse("SUCCESS",event);return}try{const userHandler=require(exports.external.userHandlerIndex).handler,result=await userHandler(sanitizedEvent,context),responseEvent=renderResponse(event,result);await submitResponse("SUCCESS",responseEvent)}catch(e){const resp={...event,Reason:exports.external.includeStackTraces?e.stack:e.message};resp.PhysicalResourceId||(event.RequestType==="Create"?(exports.external.log("CREATE failed, responding with a marker physical resource id so that the subsequent DELETE will be ignored"),resp.PhysicalResourceId=CREATE_FAILED_PHYSICAL_ID_MARKER):exports.external.log(`ERROR: Malformed event. "PhysicalResourceId" is required: ${JSON.stringify(event)}`)),await submitResponse("FAILED",resp)}}exports.handler=handler;function renderResponse(cfnRequest,handlerResponse={}){const physicalResourceId=handlerResponse.PhysicalResourceId??cfnRequest.PhysicalResourceId??cfnRequest.RequestId;if(cfnRequest.RequestType==="Delete"&&physicalResourceId!==cfnRequest.PhysicalResourceId)throw new Error(`DELETE: cannot change the physical resource ID from "${cfnRequest.PhysicalResourceId}" to "${handlerResponse.PhysicalResourceId}" during deletion`);return{...cfnRequest,...handlerResponse,PhysicalResourceId:physicalResourceId}}async function submitResponse(status,event){const json={Status:status,Reason:event.Reason??status,StackId:event.StackId,RequestId:event.RequestId,PhysicalResourceId:event.PhysicalResourceId||MISSING_PHYSICAL_ID_MARKER,LogicalResourceId:event.LogicalResourceId,NoEcho:event.NoEcho,Data:event.Data};exports.external.log("submit response to cloudformation",json);const responseBody=JSON.stringify(json),parsedUrl=url.parse(event.ResponseURL),req={hostname:parsedUrl.hostname,path:parsedUrl.path,method:"PUT",headers:{"content-type":"","content-length":Buffer.byteLength(responseBody,"utf8")}};await withRetries({attempts:5,sleep:1e3},exports.external.sendHttpRequest)(req,responseBody)}async function defaultSendHttpRequest(options,responseBody){return new Promise((resolve,reject)=>{try{const request=https.request(options,_=>resolve());request.on("error",reject),request.write(responseBody),request.end()}catch(e){reject(e)}})}function defaultLog(fmt,...params){console.log(fmt,...params)}function withRetries(options,fn){return async(...xs)=>{let attempts=options.attempts,ms=options.sleep;for(;;)try{return await fn(...xs)}catch(e){if(attempts--<=0)throw e;await sleep(Math.floor(Math.random()*ms)),ms*=2}}}exports.withRetries=withRetries;async function sleep(ms){return new Promise(ok=>setTimeout(ok,ms))}
