# Attempting to Directly Monitor a Flume Water Monitor

I have a wonderful system made by [Flume](https://flumewater.com/) which is a
water monitoring system and I recommend buying one if you are interested in
reporting your own water use. This repo is for people who already have a Flume
water monitor and are interested in learning about how it works and how it
could be monitored directly.

I'd like to be able to consume my real-time water use directly, rather than
through a cloud service. This repo is here to track what I have learned, and
hopefully will eventually contain a practical method for directly monitoring
whatever data this device manages to send.

The flume system is a two-component consumer device. One component is known as
the sensor and the other component is the bridge. Together, these components
are able to read most water meters in real time send this data to a cloud
service.

## Sensor

The sensor is a battery powered microcontroller in a water-sealed plastic case
which is designed to be physically strapped to your water meter using rubber
cords. Inside mine, an Atmel ATSAMD20 microcontroller seems to monitor a
magnetometer to sense some kind of rotating mechanism inside the water meter.
Information from that sensor is broadcast wirelessly on the ISM band at 915Mhz
using an RFM69 radio module. The sensor also appears to be sending at least
some other information, including battery state.

## Bridge

The bridge is USB powered and controlled by an ESP-12S (ESP8266) which receives
the packets broadcast by the sensor, also using an RFM69 module. The bridge
relays data to the MQTT flume cloud service which provides it to customers via
phone app. The data in these MQTT messages appears to be encrypted.

Based on my observations, I'm going to attempt to build and partially implement
the software for an additional "bridge" to keep an eye on the radio traffic.

I have not yet reached out to the manufacturer to ask if they could provide a
simpler path to direct data access, partly because I'm enjoying the puzzle. But
I may end up asking if they'd be interested in making an easier path. But for
now, here's some pseudocode for how I think the bridge monitor will need to
work.

## Bridge Pseudocode

1. Initialize the RFM69 radio in the same way as the real bridge, including
   sync words and encryption key
2. For each channel, C, of the 50 channels in 0.5Mhz increments from 902.5Mhz to 927.0Mhz
  1. For each bitrate, try (Checking all 5 should take about 0.15s)
    1. Bitrate=1200, Fdev=5Khz
      1. DccFreq=010, RxBwMant=16, RxBwExp=110
      2. Set channel C
      3. Switch to Rx
      4. Wait for ready, then wait for possible sync word match or some timeout
    2. Bitrate=4800, Fdev 10Khz
      1. DccFreq=010, RxBwMant=16, RxBwExp=101
      2. Set channel C
      3. RestartRx
      4. Wait for ready, then wait for possible sync word match or some timeout
    3. Bitrate=19200, Fdev 15Khz
      1. DccFreq=010, RxBwMant=16, RxBwExp=100
      2. Set channel C
      3. RestartRx
      4. Wait for ready, then wait for possible sync word match or some timeout
    4. Bitrate=55555, Fdev 50Khz
      1. DccFreq=010, RxBwMant=20, RxBwExp=010
      2. Set channel C
      3. RestartRx
      4. Wait for ready, then wait for possible sync word match or some timeout
    5. Bitrate=34482, Fdev 150Khz
      1. DccFreq=101, RxBwMant=16, RxBwExp=000
      1. Set channel C
      2. RestartRx
      3. Wait for ready, then wait for possible sync word match or some timeout
