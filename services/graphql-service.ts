import {GQLQueryDataCallback} from '../typings/gql-query-data-callback';
import {GQLQueryErrorCallback} from '../typings/gql-query-error-callback';
import {GQLSubscribeCallback} from '../typings/gql-subscribe-callback';
import {GQLMutateErrorCallback} from '../typings/gql-mutate-error-callback';
import {getGraphcoolHTTPEndpoint, getGraphcoolWebSocketEndpoint} from '../services/utilities-service';

const httpEndpoint = getGraphcoolHTTPEndpoint();

//TODO the GraphQL web socket protocol used below is deprecated and will be changing soon: https://github.com/apollographql/subscriptions-transport-ws/issues/149
//TODO We'll need to wait for graph.cool to update their back end before we change our client
let webSocket = new WebSocket(getGraphcoolWebSocketEndpoint(), 'graphql-subscriptions');
let subscriptions: {
    [key: string]: GQLSubscribeCallback
} = {};

webSocket.onopen = (event) => {
    const message = {
        type: 'init'
    };

    webSocket.send(JSON.stringify(message));
};

webSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case 'init_success': {
            break;
        }
        case 'init_fail': {
            throw {
                message: 'init_fail returned from WebSocket server',
                data
            };
        }
        case 'subscription_data': {
            subscriptions[data.id](data);
            break;
        }
        case 'subscription_success': {
            break;
        }
        case 'subscription_fail': {
            throw {
                message: 'subscription_fail returned from WebSocket server',
                data
            };
        }
    }
};

export const GQLQuery = async (queryString: string, userToken: string | null, dataCallback: GQLQueryDataCallback, errorCallback: GQLQueryErrorCallback) => {

    //TODO to allow for good cacheing, we'll probably need to parse the queryString so that we can get all of the properties that we need

    const response = await window.fetch(httpEndpoint, {
        method: 'post',
        headers: {
            'content-type': 'application/json',
            ...userToken && {
                'Authorization': `Bearer ${userToken}`
            } //TODO As far as I understand the syntax above will be standard and this TypeScript error might go away with the following: https://github.com/Microsoft/TypeScript/issues/10727
        },
        body: JSON.stringify({
            query: queryString
        })
    });

    const responseJSON = await response.json();
    const data = responseJSON.data;
    const errors = responseJSON.errors;

    Object.keys(data || {}).forEach((key) => {
        dataCallback(key, data[key]);
    });

    (errors || []).forEach((error: any) => {
      console.log('error', error)
        // errorCallback(error); Error Callback doesn't work at the moment
    });

    return data;
};

export const GQLMutate = async (queryString: string, userToken: string | null, errorCallback: GQLMutateErrorCallback) => {

    //TODO to allow for good cacheing, we'll probably need to parse the queryString so that we can get all of the properties that we need
    const response = await window.fetch(httpEndpoint, {
        method: 'post',
        headers: {
            'content-type': 'application/json',
            ...userToken && {
                'Authorization': `Bearer ${userToken}`
            } //TODO As far as I understand the syntax above will be standard and this TypeScript error might go away with the following: https://github.com/Microsoft/TypeScript/issues/10727
        },
        body: JSON.stringify({
            query: queryString
        })
    });

    const responseJSON = await response.json();
    const data = responseJSON.data;
    const errors = responseJSON.errors;
    (errors || []).forEach((error: any) => {
      console.log('error', error)
        // errorCallback(error);
    });

    return data;
};

//TODO potentially gaurd against multiple subscriptions
export const GQLSubscribe = (queryString: string, id: string, callback: GQLSubscribeCallback) => {
    // we need to wait for the webSocket's connection to be open
    if (webSocket.readyState !== webSocket.OPEN) {
        setTimeout(() => {
            GQLSubscribe(queryString, id, callback); // allow other tasks to run by throwing this function onto the event loop. This creates an infinite non-blocking retry
        });
        return;
    }

    subscriptions[id] = callback;

    const message = {
        id,
        type: 'subscription_start',
        query: queryString
    };

    webSocket.send(JSON.stringify(message));
};


export function escapeString(string: string) {
    return string.replace(/\n/g, '\\n').replace(/"/g, '\\"');
}
