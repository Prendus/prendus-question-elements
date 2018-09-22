//TODO this is an insecure version of the secure-eval package: https://github.com/Prendus/secure-eval
//TODO We cannot use the secure eval version right now becuase of a bug in Safari: https://bugs.webkit.org/show_bug.cgi?id=170075
//TODO this file is just a workaround until the bug is fixed. Remember that it is insecure. We are only using it
//TODO because we know are in complete control of the questions we are serving to our users, thus we don't need the added security

export interface InsecureEvalResult {
    type: 'insecure-eval-result' | 'insecure-eval-worker-terminated';
    [key: string]: any;


export function insecureEval(code: string, timeLimit: number = 10000): Promise<InsecureEvalResult> {
    return new Promise((resolve, reject) => {
        const evalWorkerSource = `
            onmessage = function(event) {
                try {
                    eval(event.data);
                }
                catch(error) {
                    postMessage({
                        error: error.toString()
                    });
                }
            }
        `;

        const blob = new window.Blob([evalWorkerSource], { type: 'application/javascript' });
        const objectURL = window.URL.createObjectURL(blob);
        const evalWorker = new Worker(objectURL);
        // const evalWorker = new Worker(objectURL, {type:'module'}); //TODO enable once module workers are possible
        
        evalWorker.postMessage(code);

        setTimeout(() => { // Terminate the web worker if it runs for too long
            evalWorker.terminate();
            resolve({
                type: 'insecure-eval-worker-terminated'
            });
        }, timeLimit);

        evalWorker.addEventListener('message', (event) => {
            resolve({
                ...event.data,
                type: 'insecure-eval-result'
            });
        });
    });
}