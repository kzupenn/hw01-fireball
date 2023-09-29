# [Project 1: Noise](https://github.com/CIS-566-Fall-2022/hw01-fireball-base)

## Name
Kevin Zhang, PennId: kzupenn, Penn#: 56877791

## Demo link
https://kzupenn.github.io/hw01-fireball/

## Documentation

Features of the project implemented

1. Perlin-based vertex and color modifiers. The fireball has a base ripple effect created from fBm with Perlin noise, which loops over time based on additional trig functions with u_Time input. The fireball will also slightly change its base color as a function of time regardless of user input.
2. Controls to customize various aspects of the fireball. Users can customize the base color of the fireball with rgb sliders. To customize the fireball, users can modify values that change the volatility (how fast flames rise and fall), explosivity (how far out flames can go), and flames color (how quickly the color gradients from the center to the edge) of the fireball. Users can also explore the music feature by uploading an mp3 file of their choice. 
3. Music-based flames on the fireball. Audio from the user-uploaded mp3 file is played and parsed into a data array. This data array is then processed to add a multiplier to positions (additional vertex position modifiers) of the fire effects of the fireball, which are then passed into the shaders. Based on a value output by fBm Perlin noise on the position of the vertex, we select the corresponding index inside of the data array.

## Instructions to run
1. Use the RGB sliders to modify the base color of the fireball. It's not an exact 1-to-1 as I've encoded the fireball to enherently be a bit redder at the core and yellower at the tips.
2. You should now see a not-so-interesting rippling ball of your color choice. Click the upload button to upload a mp3 file to the website
3. Feel free to upload whatever you want– although I highly recommend Pitbull-Fireball in the spirit of the assignment. I've also included a folder of fire music samples in my submission in case you want some quick songs that work well on hand.
4. As the song is playing, you should see a bunch of waves appear from the fireball surface. You can tune the parameters of the flame as the song goes along with the provided sliders, such as turning up the volatility in soft parts or turning down the multiplier if the volume is too saturating.
5. Enjoy!

