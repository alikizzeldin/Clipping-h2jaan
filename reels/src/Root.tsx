import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import {Reel} from './Reel';
import {Reel as ReelProps} from './types';
import sample from '../public/sample/reel.json';

export const Root: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={Math.round((sample as ReelProps).duration * 30)}
    defaultProps={sample as ReelProps}
    calculateMetadata={({props}) => ({durationInFrames: Math.round(props.duration * 30)})}
  />
);
