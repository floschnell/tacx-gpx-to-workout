import { load } from "protobufjs";

export interface ITraining {
  data: {
    segmentData: {
      item: Array<{
        positionFromStart: number;
        value: number;
      }>;
    };
  };
  info: {
    dateCreated: {
      scale: 4;
      value: number;
    };
    member: {
      name: string;
      description: string;
      segmentType: 0;
      thumbnail: null;
      trainingType: 0;
    };
  };
}

interface ISegment {
  positionFromStart: number;
  slope: number;
}

export class Training {
  private name: string;
  private date: Date;
  private segments: ISegment[];

  constructor(name: string) {
    this.name = name;
    this.date = new Date();
    this.segments = [];
  }

  public get title(): string {
    return this.name;
  }

  public pushSegment({
    length = null,
    slope = 0.0,
    positionFromStart = null,
  }: {
      length?: number,
      slope?: number,
      positionFromStart?: number,
    }) {
    if (length == null && positionFromStart == null) {
      throw new Error("Either positionFromStart or length have to be given!");
    }
    const lastPositionFromStart = this.segments.length > 0 ?
      this.segments[this.segments.length - 1].positionFromStart :
      0;
    this.segments.push({
      positionFromStart: positionFromStart != null ? positionFromStart : lastPositionFromStart + length,
      slope,
    });
  }

  public async encode(): Promise<string> {
    const training: ITraining = this.convert();
    const root = await load("assets/tacx.proto");
    const trainingMessage = root.lookupType("Training");
    const verificationErrors = trainingMessage.verify(training);
    if (verificationErrors) {
      throw new Error(verificationErrors);
    }
    const encodedTraining = await trainingMessage.encode(training);
    const reader = new FileReader();
    const promisedData = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
    });
    reader.readAsDataURL(new Blob([encodedTraining.finish()], {
      type: "application/octet-stream"
    }));
    return promisedData;
  }

  public convert(): ITraining {
    const convertedSegments: Array<{
      positionFromStart: number,
      value: number,
    }> = [];
    this.segments.forEach((segment) => {
      convertedSegments.push({
        positionFromStart: segment.positionFromStart,
        value: segment.slope,
      });
    });
    convertedSegments.push({
      positionFromStart: this.segments[this.segments.length - 1].positionFromStart,
      value: -0.1,
    });

    return {
      data: {
        segmentData: {
          item: convertedSegments,
        },
      },
      info: {
        dateCreated: {
          scale: 4,
          value: this.date.getTime(),
        },
        member: {
          name: this.name,
          description: null,
          segmentType: 0,
          thumbnail: null,
          trainingType: 0,
        },
      }
    };
  }
}