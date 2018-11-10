import * as parse from "gpx-parse/dist/gpx-parse-browser.js";
import { BSpline } from "../lib/spline";
import { Training } from "./training";

async function parseGpx(gpxData: string): Promise<any> {
  return new Promise((resolve, reject) => {
    parse.parseGpx(gpxData, (err, gpx) => {
      if (err) {
        reject(err);
      }
      resolve(gpx);
    });
  })
}

type ConvertOptions = {
  maxSlope: number;
  rasterSize: number;
  workoutName: string;
};

export async function convertGpxToTacxWorkout(gpxData, {
  maxSlope,
  rasterSize,
  workoutName,
}: ConvertOptions, resultBox: HTMLElement): Promise<Training> {
  const gpsSegments = [];
  let totalDistance = 0;

  const gpx = await parseGpx(gpxData);
  gpx.tracks[0].segments[0].forEach((segment, index) => {
    if (index > 0) {
      const previousSegment = gpx.tracks[0].segments[0][index - 1];
      const distance = parse.utils.calculateDistance(previousSegment.lat, previousSegment.lon, segment.lat, segment.lon) * 1609.34;
      const slope = (segment.elevation - previousSegment.elevation) / distance;
      totalDistance += distance;
      const maxSlopeInPercent = maxSlope / 100.0;
      gpsSegments.push({
        x: totalDistance,
        y: Math.min(Math.max(slope, -maxSlopeInPercent), maxSlopeInPercent),
        height: segment.elevation,
      });
    }
  });

  resultBox.innerHTML += `total segments found in gpx track: ${gpsSegments.length}<br />`;

  const smoothedSegments = [];
  const spl = new BSpline(gpsSegments.map(p => [p.x, p.y]), 5, true);
  for (let t = 0; t < 1; t += (5.0 / totalDistance)) {
    const sp = spl.calcAt(t);
    smoothedSegments.push({ x: sp[0], y: sp[1] });
  }

  resultBox.innerHTML += `segments after smoothing: ${smoothedSegments.length}<br />`;

  const rasterizedSegments = [smoothedSegments[0]];
  smoothedSegments.forEach((node) => {
    const lastNode = rasterizedSegments[rasterizedSegments.length - 1];
    if (Math.abs(lastNode.y - node.y) >= rasterSize / 100.0) {
      rasterizedSegments.push(node);
    }
  });

  resultBox.innerHTML += `segments after rasterization: ${rasterizedSegments.length}<br />`;

  console.log("num rasterized segments:" + rasterizedSegments.length);
  console.log("rasterized segments:", rasterizedSegments);

  const training = new Training(workoutName);
  rasterizedSegments.forEach((segment) => {
    training.pushSegment({
      positionFromStart: segment.x,
      slope: segment.y,
    });
  });

  return training;
}