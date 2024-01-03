export const exampleGcode = `; This example shows a boring operation, then an internal grooving operation

G21 ; metric
G18 ; ZX plane
G90 ; absolute positioning
F200
X0 ; zero your tool X on centerline
Z0 ; zero your tool Z at the right edge of the stock
G91 ; relative positioning

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

;1mm

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

;2mm

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

;3mm

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

;4mm

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

;5mm

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

;6mm

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

;7mm

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

;8mm

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

;9mm

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

Z0.25 ; cut
X-5 ; cut

X5 ; retract

;10mm

Z-10

Z3.25 ; cut
X-5 ; cut

X-1.7 ; cut

X6.7 ; retract
Z-3.25 ; retract
`;