class StreetviewElement {
    constructor(element) {
        this.element = element;
    }

    setLocation(lat, lon) {
        if (this.panorama !== undefined) {
            this.panorama.setPosition({ lat: lat, lng: lon });
        } else {
            this.panorama = new google.maps.StreetViewPanorama(
                this.element, {
                    position: { lat: lat, lng: lon },
                    addressControl: false,
                    linksControl: true,
                    panControl: true,
                    enableCloseButton: false,
                    showRoadLabels: false,
                    motionTracking: false,
                    fullscreenControl: false,
                    // motionTrackingControl: false,
                });
        }
    }
}