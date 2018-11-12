interface ITrainingFile {
  uuid: string,
  uploadUrl: string,
  generatedCourseUuid: string,
}

export class TacxApi {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async saveTraining(trainingData: string): Promise<string> {
    const trainingFile = await this.createTrainingFile();
    const boundary = Math.random().toString().substr(2);
    const data = trainingData.substr(trainingData.indexOf(",") + 1);
    await fetch(trainingFile.uploadUrl, {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; charset=utf-8; boundary=" + boundary,
      },
      body: "--" + boundary + '\r\nContent-Disposition: form-data; name="token"\r\nContent-Type: text/plain; charset=US-ASCII\r\nContent-Transfer-Encoding: 8bit\r\n\r\n' + this.token + "\r\n--" + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="' + trainingFile.uuid + '"\r\nContent-Type: application/octet-stream\r\nContent-Transfer-Encoding: base64\r\n\r\n' + data + "\r\n--" + boundary + "--\r\n",
    });
    while (!await this.doesWorkoutExist(trainingFile.generatedCourseUuid)) {
      await new Promise((resolve) => window.setTimeout(() => resolve(), 1000));
    }
    return `https://cloud.tacx.com/#/workouts/${trainingFile.generatedCourseUuid}`;
  }

  private async createTrainingFile(): Promise<ITrainingFile> {
    const response = await fetch("https://tacx-cloud.appspot.com/_ah/api/file/v1/device/web/files/?token=" + this.token, {
      method: "POST",
      body: JSON.stringify({
        type: "training",
        generateCourseFromTraining: true,
      }),
    });
    const result = await response.json();
    if (result.error != null) {
      throw new Error(`Error while creating workout: "${result.error.message}"`);
    }
    return result;
  }

  private async doesWorkoutExist(courseId: string): Promise<boolean> {
    const response = await fetch("https://tacx-cloud.appspot.com/_ah/api/workout/v1/" + courseId + "?token=" + this.token);
    return response.ok;
  }
}