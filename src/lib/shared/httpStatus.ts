export enum EHTTPStatus {
  CONTINUE                        ,//= 100,
  SWITCHING_PROTOCOLS             ,//= 101,
  EARLY_HINTS                     ,//= 103,
  OK                              ,//= 200,
  CREATED                         ,//= 201,
  ACCEPTED                        ,//= 202,
  NONAUTHORATIVE_INFORMATION      ,//= 203,
  NO_CONTENT                      ,//= 204,
  RESET_CONTENT                   ,//= 205,
  PARTIAL_CONTENT                 ,//= 206,
  MULTIPLE_CHOICES                ,//= 300,
  MOVED_PERMANENTLY               ,//= 301,
  FOUND                           ,//= 302,
  SEE_OTHER                       ,//= 303,
  NOT_MODIFIED                    ,//= 304,
  TEMP_REDIRECT                   ,//= 307,
  PERM_REDIRECT                   ,//= 308,
  BAD_REQUEST                     ,//= 400,
  UNAUTHORIZED                    ,//= 401,
  FORBIDDEN                       ,//= 403,
  NOT_FOUND                       ,//= 404,
  METHOD_NOT_ALLOWED              ,//= 405,
  NOT_ACCEPTABLE                  ,//= 406,
  PROXY_AUTH_REQUIRED             ,//= 407,
  REQUEST_TIMEOUT                 ,//= 408,
  CONFLICT                        ,//= 409,
  GONE                            ,//= 410,
  LENGTH_REQUIRED                 ,//= 411,
  PRECONDITION_FAILED             ,//= 412,
  PAYLOAD_TOO_LARGE               ,//= 413,
  URI_TOO_LONG                    ,//= 414,
  UNSUPPORTED_MEDIA_TYPE          ,//= 415,
  RANGE_NOT_SATIFIABLE            ,//= 416,
  EXPECTATION_FAILED              ,//= 417,
  IM_A_TEAPOT                     ,//= 418,
  KEEP_YOUR_CALM                  ,//= 420,
  MISDIRECTED_REQUEST             ,//= 421,
  UPGRADE_REQUIRED                ,//= 426,
  PRECONDITION_REQUIRED           ,//= 428,
  TOO_MANY_REQUESTS               ,//= 429,
  REQ_HEADER_FIELDS_TOO_LARGE     ,//= 431,
  UNAVAILIBLE_FOR_LEGAL_REASONS   ,//= 451,
  INTERNAL_SERVER_ERROR           ,//= 500,
  NOT_IMPLEMENTED                 ,//= 501,
  BAD_GATEWAY                     ,//= 502,
  SERVICE_UNAVAILIBLE             ,//= 503,
  GATEWAY_TIMEOUT                 ,//= 504,
  VARIANT_ALSO_NEGOTIATES         ,//= 506,
  NOT_EXTENDED                    ,//= 510,
  NET_AUTH_REQUIRED               ,//= 511

}

export const stat_reg = [
  [EHTTPStatus.CONTINUE, "continue", 100],
  [EHTTPStatus.SWITCHING_PROTOCOLS, "switching_protocols", 101],
  [EHTTPStatus.EARLY_HINTS, "early_hints", 103],
  [EHTTPStatus.OK, "ok", 200],
  [EHTTPStatus.CREATED, "created", 201],
  [EHTTPStatus.ACCEPTED, "accepted", 202],
  [EHTTPStatus.NONAUTHORATIVE_INFORMATION, "non-authorative_information", 203],
  [EHTTPStatus.NO_CONTENT, "no_content", 204],
  [EHTTPStatus.RESET_CONTENT, "reset_content", 205],
  [EHTTPStatus.PARTIAL_CONTENT, "partial_content", 206],
  [EHTTPStatus.MULTIPLE_CHOICES, "multiple_choices", 300],
  [EHTTPStatus.MOVED_PERMANENTLY, "moved_permanently", 301],
  [EHTTPStatus.FOUND, "found", 302],
  [EHTTPStatus.SEE_OTHER, "see_other", 303],
  [EHTTPStatus.NOT_MODIFIED, "not_modified", 304],
  [EHTTPStatus.TEMP_REDIRECT, "temp_redirect", 307],
  [EHTTPStatus.PERM_REDIRECT, "perm_redirect", 308],
  [EHTTPStatus.BAD_REQUEST, "bad_request", 400],
  [EHTTPStatus.UNAUTHORIZED, "unauthorized", 401],
  [EHTTPStatus.FORBIDDEN, "forbidden", 403],
  [EHTTPStatus.NOT_FOUND, "not_found", 404],
  [EHTTPStatus.METHOD_NOT_ALLOWED, "method_not_allowed", 405],
  [EHTTPStatus.NOT_ACCEPTABLE, "not_acceptable", 406],
  [EHTTPStatus.PROXY_AUTH_REQUIRED, "proxy_auth_required", 407],
  [EHTTPStatus.REQUEST_TIMEOUT, "request_timeout", 408],
  [EHTTPStatus.CONFLICT, "conflict", 409],
  [EHTTPStatus.GONE, "gone", 410],
  [EHTTPStatus.LENGTH_REQUIRED, "length_required", 411],
  [EHTTPStatus.PRECONDITION_FAILED, "precondition_failed", 412],
  [EHTTPStatus.PAYLOAD_TOO_LARGE, "payload_too_large", 413],
  [EHTTPStatus.URI_TOO_LONG, "uri_too_long", 414],
  [EHTTPStatus.UNSUPPORTED_MEDIA_TYPE, "unsupported_media_type", 415],
  [EHTTPStatus.RANGE_NOT_SATIFIABLE, "range_not_satifiable", 416],
  [EHTTPStatus.EXPECTATION_FAILED, "expectation_failed", 417],
  [EHTTPStatus.IM_A_TEAPOT, "im_a_teapot", 418],
  [EHTTPStatus.KEEP_YOUR_CALM, "keep_your_calm", 420],
  [EHTTPStatus.MISDIRECTED_REQUEST, "misdirected_request", 421],
  [EHTTPStatus.UPGRADE_REQUIRED, "upgrade_required", 426],
  [EHTTPStatus.PRECONDITION_REQUIRED, "precondition_required", 428],
  [EHTTPStatus.TOO_MANY_REQUESTS, "too_many_requests", 429],
  [EHTTPStatus.REQ_HEADER_FIELDS_TOO_LARGE, "req_header_fields_too_large", 431],
  [EHTTPStatus.UNAVAILIBLE_FOR_LEGAL_REASONS, "unavailible_for_legal_reasons", 451],
  [EHTTPStatus.INTERNAL_SERVER_ERROR, "internal_server_error", 500],
  [EHTTPStatus.NOT_IMPLEMENTED, "not_implemented", 501],
  [EHTTPStatus.BAD_GATEWAY, "bad_gateway", 502],
  [EHTTPStatus.SERVICE_UNAVAILIBLE, "service_unavailible", 503],
  [EHTTPStatus.GATEWAY_TIMEOUT, "gateway_timeout", 504],
  [EHTTPStatus.VARIANT_ALSO_NEGOTIATES, "variant_also_negotiates", 506],
  [EHTTPStatus.NOT_EXTENDED, "not_extended", 510],
  [EHTTPStatus.NET_AUTH_REQUIRED, "net_auth_required", 511]
  
];

export function status2CodeNStr(status: EHTTPStatus | number | string): ICodeNStrRet {
  let stat = status;
  if (typeof status == "string")
    stat = joinUnderscore(String(status).toLowerCase());

  let state = null;

  for (const entry of stat_reg) {
    // console.log(entry)
    if (entry.includes(stat))
      state = {
        code: entry[2],
        status: splitSpace(String(entry[1])).toUpperCase(),
        EHTTPStatus_val: entry[0],
      };
  }

  if (state == null) return status2CodeNStr(500);
  return state;
}


export interface ICodeNStrRet {
  code: number,
  status: string,
  EHTTPStatus_val: EHTTPStatus
}

export function joinUnderscore(input: string): string {
  const splitAll = input.split("")
  let newSplit = []
  for (const CHAR of splitAll) {
    if (CHAR == " " || CHAR == "-") newSplit.push("_")
    else newSplit.push(CHAR)
  }
  return newSplit.join()
}

export function splitSpace(input: string) {
  return input
  // const splitAll = input.split("")
  // let newSplit = []
  // for (const CHAR of splitAll) {
  //   if (CHAR == "_") newSplit.push(" ")
  //   else newSplit.push(CHAR)
  // }
  // const join = newSplit.join()
  // console.log(input, splitAll, newSplit, join)
  // return join
}