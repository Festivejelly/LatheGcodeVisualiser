import { gapi } from 'gapi-script';

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

const DEFAULT_CLIENT_ID = '349142714775-v6pkei8amce6jjq4fbpu07vrcvk4k1vl.apps.googleusercontent.com';

export function initializeGoogleDriveAPI(clientId: string = DEFAULT_CLIENT_ID) {
  gapi.load('client:auth2', () => {
    gapi.client.init({
      clientId: clientId,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      scope: SCOPES,
    });
  });
}

export function signInToGoogle() {
  return gapi.auth2.getAuthInstance().signIn();
}

export function signOutFromGoogle() {
  return gapi.auth2.getAuthInstance().signOut();
}

export async function saveFileToGoogleDrive(fileName: string, content: string) {
  const fileContent = new Blob([content], { type: 'application/json' });
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', fileContent);

  const token = gapi.auth.getToken()?.access_token;
  if (!token) {
    throw new Error('User is not authenticated');
  }

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: new Headers({
      Authorization: `Bearer ${token}`,
    }),
    body: form,
  });

  return response.json();
}

export async function loadFileFromGoogleDrive(fileId: string) {
  const token = gapi.auth.getToken()?.access_token;
  if (!token) {
    throw new Error('User is not authenticated');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    method: 'GET',
    headers: new Headers({
      Authorization: `Bearer ${token}`,
    }),
  });

  return response.json();
}
