import { TacxApi } from "./tacx/tacxApi";
import { convertGpxToTacxWorkout } from "./tacx/converter";

const tacxTokenInput = document.querySelector("#tacxToken") as HTMLInputElement;
const gpxFileInput = document.querySelector("#gpxFile") as HTMLInputElement;
const convertButton = document.querySelector("#startConversionButton") as HTMLInputElement;
const resultBox = document.querySelector("#result") as HTMLElement;
const rasterSizeInput = document.querySelector("#rasterSize") as HTMLInputElement;
const maxSlopeInput = document.querySelector("#maxSlope") as HTMLInputElement;

maxSlopeInput.oninput = () => document.querySelector("#maxSlopeValue").innerHTML = `${maxSlopeInput.value} %`;
rasterSizeInput.oninput = () => document.querySelector("#rasterSizeValue").innerHTML = `${rasterSizeInput.value} %`;

function readTextFile(file: File): Promise<string> {
  const reader = new FileReader();
  const promisedResult = new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
  });
  reader.readAsText(file);
  return promisedResult;
}

convertButton.onclick = async () => {
  const files = gpxFileInput.files;
  const token = tacxTokenInput.value;
  const rasterSize = rasterSizeInput.valueAsNumber;
  const maxSlope = maxSlopeInput.valueAsNumber;
  const tacxApi = new TacxApi(token);
  convertButton.disabled = true;
  resultBox.innerHTML = "";

  if (files.length === 1) {
    try {
      const gpxFile = files.item(0);
      const workoutName = gpxFile.name.toUpperCase().replace(".GPX", "");

      const gpxData = await readTextFile(gpxFile);

      const training = await convertGpxToTacxWorkout(gpxData, {
        maxSlope,
        rasterSize,
        workoutName,
      }, resultBox);

      resultBox.innerHTML += `saving workout ...<br />`;

      const tacxTraining = await training.encode();
      await tacxApi.saveTraining(tacxTraining);
      resultBox.innerHTML += `workout has been saved as "${training.title}"<br />`;
    } catch (e) {
      resultBox.innerHTML += "an error occured during the conversion!<br>";
      resultBox.innerHTML += `${e}<br />`;
    }

    convertButton.disabled = false;
  } else {
    resultBox.innerHTML += "no gpx file selected!";
    convertButton.disabled = false;
  }
};