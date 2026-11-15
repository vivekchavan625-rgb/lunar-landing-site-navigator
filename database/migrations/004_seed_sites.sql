-- Curated sites. verified=FALSE on purpose: coordinates below are commonly cited LROC-era values entered from memory
-- by the prompt author and MUST be checked against the cited source before flipping verified=TRUE.
-- Do NOT add Artemis/CLPS south-pole rows unless you can cite an authoritative coordinate; broad target regions
-- are 'PLANNED_TARGET_REGION'/'CANDIDATE_REGION', never exact points.
INSERT INTO landing_sites (slug,name,mission_name,mission_category,latitude,longitude,latitude_type,coordinate_frame,location_status,coordinate_accuracy_m,source_name,source_url,verified,description) VALUES
('apollo-11','Tranquility Base','Apollo 11','APOLLO',0.67416,23.47314,'PLANETOCENTRIC','MOON_ME','CONFIRMED_LANDING_SITE',NULL,'LROC / NASA Apollo Lunar Surface Journal (verify)','https://www.lroc.asu.edu/featured_sites/',FALSE,'Mare Tranquillitatis'),
('apollo-12','Oceanus Procellarum (Apollo 12)','Apollo 12','APOLLO',-3.01239,-23.42157,'PLANETOCENTRIC','MOON_ME','CONFIRMED_LANDING_SITE',NULL,'LROC (verify)','https://www.lroc.asu.edu/featured_sites/',FALSE,NULL),
('apollo-14','Fra Mauro (Apollo 14)','Apollo 14','APOLLO',-3.64530,-17.47136,'PLANETOCENTRIC','MOON_ME','CONFIRMED_LANDING_SITE',NULL,'LROC (verify)','https://www.lroc.asu.edu/featured_sites/',FALSE,NULL),
('apollo-15','Hadley-Apennine (Apollo 15)','Apollo 15','APOLLO',26.13224,3.62856,'PLANETOCENTRIC','MOON_ME','CONFIRMED_LANDING_SITE',NULL,'LROC (verify)','https://www.lroc.asu.edu/featured_sites/',FALSE,NULL),
('apollo-16','Descartes (Apollo 16)','Apollo 16','APOLLO',-8.97301,15.50019,'PLANETOCENTRIC','MOON_ME','CONFIRMED_LANDING_SITE',NULL,'LROC (verify)','https://www.lroc.asu.edu/featured_sites/',FALSE,NULL),
('apollo-17','Taurus-Littrow (Apollo 17)','Apollo 17','APOLLO',20.1908,30.7717,'PLANETOCENTRIC','MOON_ME','CONFIRMED_LANDING_SITE',NULL,'LROC (verify)','https://www.lroc.asu.edu/featured_sites/',FALSE,NULL),
('ref-south-pole','Lunar South Pole (reference point)','Reference','REFERENCE',-90,0,'PLANETOCENTRIC','MOON_ME','ILLUSTRATIVE',0,'Geometric pole','https://naif.jpl.nasa.gov/naif/spiceconcept.html',TRUE,'Illustrative pole point; not a landing site'),
('ref-north-pole','Lunar North Pole (reference point)','Reference','REFERENCE',90,0,'PLANETOCENTRIC','MOON_ME','ILLUSTRATIVE',0,'Geometric pole','https://naif.jpl.nasa.gov/naif/spiceconcept.html',TRUE,'Illustrative pole point; not a landing site'),
('ref-subearth','Sub-Earth point (reference)','Reference','REFERENCE',0,0,'PLANETOCENTRIC','MOON_ME','ILLUSTRATIVE',0,'Mean-Earth frame origin','https://naif.jpl.nasa.gov/naif/spiceconcept.html',TRUE,'Lon 0 lat 0 in the mean-Earth frame');
